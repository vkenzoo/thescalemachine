"use client";

import * as React from "react";
import Link from "next/link";
import useSWR from "swr";
import {
  Plus,
  ExternalLink,
  Settings,
  Eye,
  Trash2,
  Search,
  Library,
  Copy,
  Lock,
  Loader2,
} from "lucide-react";
import { ModuleHeader } from "@/components/layout/module-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { NewReportModal, type ReportEditPayload } from "@/components/reports/new-report-modal";
import { Pencil } from "lucide-react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown";
import { useToast } from "@/components/ui/toast";

interface ReportRow {
  id: string;
  slug: string;
  name: string;
  accounts: number;
  metrics: number;
  views: number;
  hasPassword: boolean;
  is_public: boolean;
  level: string;
  updatedAt: string;
}

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export default function ReportsPage() {
  const { push } = useToast();
  const [open, setOpen] = React.useState(false);
  const [editing, setEditing] = React.useState<ReportEditPayload | null>(null);
  const [query, setQuery] = React.useState("");

  const { data: tplData, mutate: mutateTpls } = useSWR<{ templates: Array<{
    id: string; name: string; level: string; accounts: string[];
    metrics: string[]; sections: string[]; funnel_steps: string[];
  }> }>("/api/reports?templates=1", fetcher);
  const templates = tplData?.templates ?? [];

  const useTemplate = (tpl: typeof templates[number]) => {
    // editing com id="" → modal pré-popula como template, mas vai POST (não PATCH)
    setEditing({
      id: "",
      name: tpl.name,
      level: tpl.level,
      accounts: tpl.accounts,
      metrics: tpl.metrics,
      sections: tpl.sections,
      funnel_steps: tpl.funnel_steps,
      ig_account: null,
      is_public: true,
    });
    setOpen(true);
  };

  const saveAsTemplate = async (id: string, name: string) => {
    const res = await fetch("/api/reports", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, is_template: true }),
    });
    if (res.ok) {
      push({ tone: "success", title: "Salvo como template", description: name });
      mutateTpls();
      mutate();
    }
  };
  const { data, isLoading, mutate } = useSWR<{ reports: ReportRow[] }>(
    "/api/reports", fetcher
  );
  const reports = data?.reports ?? [];

  const filtered = React.useMemo(
    () => reports.filter((r) => r.name.toLowerCase().includes(query.toLowerCase())),
    [reports, query]
  );

  const openEdit = async (id: string) => {
    const res = await fetch(`/api/reports/${id}`);
    const json = await res.json();
    if (!res.ok || !json.report) {
      push({ tone: "warning", title: "Não foi possível abrir o relatório" });
      return;
    }
    setEditing({
      id: json.report.id,
      name: json.report.name,
      level: json.report.level,
      accounts: json.report.accounts ?? [],
      metrics: json.report.metrics ?? [],
      sections: json.report.sections ?? [],
      funnel_steps: json.report.funnel_steps ?? [],
      ig_account: json.report.ig_account ?? null,
      is_public: !!json.report.is_public,
    });
    setOpen(true);
  };

  const remove = async (id: string, name: string) => {
    if (!confirm(`Remover "${name}"?`)) return;
    const res = await fetch(`/api/reports?id=${id}`, { method: "DELETE" });
    const json = await res.json();
    if (!res.ok) {
      push({ tone: "warning", title: "Falhou", description: json.detail ?? json.error });
      return;
    }
    push({ tone: "info", title: "Relatório removido", description: name });
    mutate();
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-6">
      <ModuleHeader
        eyebrow="Análise"
        title="Relatórios"
        description="Crie relatórios personalizados para compartilhar com clientes."
        actions={
          <div className="flex gap-2">
            {templates.length > 0 && (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="secondary">
                    <Library /> Templates ({templates.length})
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  {templates.map((tpl) => (
                    <DropdownMenuItem key={tpl.id} onSelect={() => useTemplate(tpl)}>
                      {tpl.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            )}
            <Button variant="primary" onClick={() => { setEditing(null); setOpen(true); }}>
              <Plus /> Novo Relatório
            </Button>
          </div>
        }
      />

      {reports.length > 0 && (
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-ink-dim pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar relatório…"
            className="pl-9 h-10"
          />
        </div>
      )}

      {isLoading ? (
        <div className="py-10 flex items-center justify-center text-ink-muted text-sm gap-2">
          <Loader2 className="size-4 animate-spin" />Carregando…
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState
          icon={Library}
          title={query ? `Nenhum relatório encontrado para "${query}"` : "Nenhum relatório criado"}
          description={query ? "Tente outro termo ou limpe a busca." : 'Clique em "Novo Relatório" para começar.'}
          action={
            !query ? (
              <Button variant="primary" onClick={() => setOpen(true)}>
                <Plus /> Criar primeiro relatório
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="space-y-2.5">
          {filtered.map((r) => (
            <ReportRowItem
              key={r.id}
              report={r}
              onCopy={() => {
                const origin = window.location.origin;
                navigator.clipboard.writeText(`${origin}/r/${r.slug}`);
                push({ tone: "success", title: "Link copiado", description: r.name });
              }}
              onEdit={() => openEdit(r.id)}
              onSaveAsTemplate={() => saveAsTemplate(r.id, r.name)}
              onDelete={() => remove(r.id, r.name)}
            />
          ))}
        </div>
      )}

      <NewReportModal
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) setEditing(null);
        }}
        editing={editing}
        onCreated={() => mutate()}
      />
    </div>
  );
}

function ReportRowItem({
  report,
  onCopy,
  onEdit,
  onSaveAsTemplate,
  onDelete,
}: {
  report: ReportRow;
  onCopy: () => void;
  onEdit: () => void;
  onSaveAsTemplate: () => void;
  onDelete: () => void;
}) {
  const origin = typeof window !== "undefined" ? window.location.origin : "";
  return (
    <div className="rounded-xl border border-line bg-bg-surface px-5 py-4 hover:border-line-strong transition-colors group">
      <div className="flex items-center gap-4">
        <div className="flex-1 min-w-0 space-y-1.5">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-md font-semibold text-ink">{report.name}</h3>
            {report.hasPassword ? (
              <Badge tone="warning" size="xs" className="gap-1">
                <Lock className="size-2.5" />
                Protegido por senha
              </Badge>
            ) : report.is_public ? (
              <Badge tone="positive" size="xs">Público</Badge>
            ) : (
              <Badge tone="neutral" size="xs">Privado</Badge>
            )}
          </div>

          <p className="text-xs text-ink-muted">
            {report.accounts} {report.accounts === 1 ? "conta" : "contas"} · {report.metrics} métricas · {report.views} visualizações
            <span className="text-ink-dim mx-1.5">·</span>
            Atualizado em {report.updatedAt}
          </p>

          <div className="flex items-center gap-2">
            <Link
              href={`/r/${report.slug}`}
              target="_blank"
              className="text-xs font-mono text-ink-dim hover:text-accent transition-colors truncate max-w-[400px]"
            >
              {origin}/r/{report.slug.slice(0, 16)}…
            </Link>
            <button
              onClick={onCopy}
              className="size-5 inline-flex items-center justify-center rounded text-ink-dim hover:text-accent hover:bg-bg-elevated transition-colors cursor-pointer"
              aria-label="Copiar link"
            >
              <Copy className="size-3" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Link href={`/r/${report.slug}`} target="_blank">
            <Button variant="secondary" size="sm">
              <ExternalLink /> Abrir
            </Button>
          </Link>
          <Button variant="secondary" size="sm" onClick={onEdit}>
            <Pencil /> Editar
          </Button>
          <Button variant="ghost" size="sm" onClick={onSaveAsTemplate} title="Salvar como template">
            <Library />
          </Button>
          <Button
            variant="ghost"
            size="icon-sm"
            aria-label="Excluir"
            onClick={onDelete}
            className="text-negative hover:text-negative bg-negative/10 hover:bg-negative/20"
          >
            <Trash2 />
          </Button>
        </div>
      </div>
    </div>
  );
}
