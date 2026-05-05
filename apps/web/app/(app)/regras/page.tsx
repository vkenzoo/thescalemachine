"use client";

import * as React from "react";
import {
  Bot,
  Plus,
  Activity,
  Clock,
  MoreHorizontal,
  Pencil,
  History,
  Trash2,
  Sparkles,
  AlertCircle,
  Play,
} from "lucide-react";
import { ModuleHeader } from "@/components/layout/module-header";
import { EmptyState } from "@/components/layout/empty-state";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "@/components/ui/dropdown";
import { useToast } from "@/components/ui/toast";
import { NewRuleModal } from "@/components/regras/new-rule-modal";
import {
  useRules,
  updateRule,
  deleteRule,
  createRule,
  type Rule,
} from "@/lib/hooks/use-automation";
import { formatRuleNatural } from "@/lib/automation-format";
import { RULE_TEMPLATES, type RuleTemplate } from "@/lib/rule-templates";
import { cn } from "@/lib/cn";

export default function RegrasPage() {
  const { push } = useToast();
  const { rules, isLoading, error, refresh } = useRules();
  const [open, setOpen] = React.useState(false);
  const [prefilled, setPrefilled] = React.useState<RuleTemplate["preset"] | null>(null);
  const [editing, setEditing] = React.useState<Rule | null>(null);

  const handleToggle = async (rule: Rule) => {
    const next = rule.status === "active" ? "paused" : "active";
    try {
      await updateRule(rule.id, { status: next });
      await refresh();
      push({
        tone: "info",
        title: next === "active" ? "Regra ativada" : "Regra pausada",
        description: rule.name,
      });
    } catch (e: any) {
      push({ tone: "danger", title: "Erro", description: e.message });
    }
  };

  const handleDelete = async (rule: Rule) => {
    try {
      await deleteRule(rule.id);
      await refresh();
      push({ tone: "info", title: "Regra excluída" });
    } catch (e: any) {
      push({ tone: "danger", title: "Erro ao excluir", description: e.message });
    }
  };

  const handleUseTemplate = async (template: RuleTemplate) => {
    setEditing(null);
    setPrefilled(template.preset);
    setOpen(true);
  };

  const handleEdit = (rule: Rule) => {
    setPrefilled(null);
    setEditing(rule);
    setOpen(true);
  };

  const [verifying, setVerifying] = React.useState(false);
  const verifyNow = async (ruleId?: string) => {
    setVerifying(true);
    push({
      tone: "info",
      title: ruleId ? "Avaliando regra…" : "Avaliando regras…",
      description: "Buscando insights e aplicando ações que casarem.",
    });
    try {
      const res = await fetch("/api/cron/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ force: true, ...(ruleId ? { rule_id: ruleId } : {}) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error ?? `HTTP ${res.status}`);
      push({
        tone: data.triggered > 0 ? "warning" : "success",
        title: data.triggered > 0
          ? `${data.triggered} ação${data.triggered === 1 ? "" : "s"} executada${data.triggered === 1 ? "" : "s"}`
          : "Nenhuma regra disparou",
        description: `${data.evaluated} regra${data.evaluated === 1 ? "" : "s"} avaliada${data.evaluated === 1 ? "" : "s"}.`,
      });
      await refresh();
    } catch (e: any) {
      push({ tone: "danger", title: "Erro na verificação", description: e.message });
    } finally {
      setVerifying(false);
    }
  };

  return (
    <div className="max-w-[1280px] mx-auto px-6 py-8 space-y-8">
      <ModuleHeader
        eyebrow="Automação"
        title="Regras Automatizadas"
        description="Crie regras que rodam sozinhas: pausam campanhas com CPA alto, escalam o que está dando resultado, protegem contra gasto descontrolado."
        tutorial
        actions={
          <>
            <Button
              variant="secondary"
              onClick={() => verifyNow()}
              disabled={rules.length === 0 || verifying}
              loading={verifying}
            >
              {!verifying && <Play />} Verificar agora
            </Button>
            <Button variant="primary" onClick={() => { setPrefilled(null); setOpen(true); }}>
              <Plus /> Nova regra
            </Button>
          </>
        }
      />

      {isLoading && rules.length === 0 ? (
        <div className="space-y-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="h-24 rounded-lg border border-line bg-bg-elevated/40 animate-pulse" />
          ))}
        </div>
      ) : error ? (
        <EmptyState
          icon={AlertCircle}
          title="Erro ao carregar regras"
          description={error.message ?? "Tente recarregar a página."}
          size="md"
        />
      ) : rules.length === 0 ? (
        <>
          {/* Templates como primeira coisa que o user vê */}
          <section className="space-y-3">
            <div className="flex items-baseline gap-2">
              <Sparkles className="size-4 text-accent" />
              <h2 className="text-md font-semibold text-ink">Comece com um template</h2>
              <span className="text-2xs text-ink-dim">· 1 clique pra criar</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {RULE_TEMPLATES.map((t) => (
                <TemplateCard key={t.id} template={t} onUse={() => handleUseTemplate(t)} />
              ))}
            </div>
          </section>

          {/* Empty state com CTA pra custom */}
          <div className="rounded-xl border border-dashed border-line bg-bg-surface/50 p-8 text-center space-y-3">
            <p className="text-sm text-ink-muted">Quer algo bem específico?</p>
            <Button variant="secondary" onClick={() => { setPrefilled(null); setOpen(true); }}>
              <Plus /> Criar regra do zero
            </Button>
          </div>
        </>
      ) : (
        <>
          {/* Quick-add templates */}
          <section className="space-y-3">
            <div className="flex items-baseline gap-2">
              <Sparkles className="size-4 text-accent" />
              <span className="text-2xs uppercase tracking-wider font-semibold text-ink-dim">
                Adicionar template
              </span>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1">
              {RULE_TEMPLATES.map((t) => (
                <button
                  key={t.id}
                  onClick={() => handleUseTemplate(t)}
                  className="shrink-0 inline-flex items-center gap-2 px-3 h-9 rounded-md border border-line bg-bg-surface hover:border-accent/40 hover:bg-accent-subtle/20 text-xs font-medium text-ink-muted hover:text-accent transition-colors cursor-pointer"
                >
                  <span>{t.emoji}</span>
                  {t.title}
                </button>
              ))}
            </div>
          </section>

          <section className="space-y-3">
            <div className="flex items-baseline justify-between">
              <h2 className="text-md font-semibold text-ink">Suas regras</h2>
              <span className="text-2xs text-ink-dim">
                {rules.length} {rules.length === 1 ? "regra" : "regras"}
                {" · Plano "}
                <span className="text-accent font-medium">Pro</span> permite até 10
              </span>
            </div>

            <TooltipProvider delayDuration={250}>
              <div className="grid gap-3">
                {rules.map((r) => (
                  <RuleCard
                    key={r.id}
                    rule={r}
                    onToggle={() => handleToggle(r)}
                    onEdit={() => handleEdit(r)}
                    onDelete={() => handleDelete(r)}
                  />
                ))}
              </div>
            </TooltipProvider>
          </section>
        </>
      )}

      <NewRuleModal
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) { setPrefilled(null); setEditing(null); }
        }}
        prefilled={prefilled}
        editing={editing}
        onCreated={async () => {
          await refresh();
        }}
      />
    </div>
  );
}

// =============================================================
// Template Card
// =============================================================
function TemplateCard({
  template,
  onUse,
}: {
  template: RuleTemplate;
  onUse: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onUse}
      className="group rounded-xl border border-line bg-bg-surface p-4 text-left hover:border-accent/40 hover:bg-accent-subtle/10 transition-all cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-md bg-bg-inset border border-line grid place-items-center text-lg shrink-0 group-hover:bg-accent-subtle/30 transition-colors">
          {template.emoji}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-ink leading-tight">{template.title}</p>
          <p className="text-2xs text-ink-muted mt-1.5 leading-relaxed pretty">
            {template.description}
          </p>
        </div>
        <div className="opacity-0 group-hover:opacity-100 transition-opacity text-2xs text-accent font-medium shrink-0 mt-1">
          Usar →
        </div>
      </div>
    </button>
  );
}

// =============================================================
// Rule Card
// =============================================================
function RuleCard({
  rule,
  onToggle,
  onEdit,
  onDelete,
}: {
  rule: Rule;
  onToggle: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const isActive = rule.status === "active";
  const naturalLanguage = formatRuleNatural(rule);
  const lastRunRelative = rule.last_run_at
    ? relativeTime(rule.last_run_at)
    : null;

  return (
    <div className={cn(
      "rounded-lg border bg-bg-surface p-4 transition-colors group",
      isActive ? "border-line hover:border-line-strong" : "border-line/60 opacity-75"
    )}>
      <div className="flex items-start gap-4">
        <div className={cn(
          "size-10 rounded-md grid place-items-center shrink-0 mt-0.5",
          isActive ? "bg-accent-subtle text-accent" : "bg-bg-elevated text-ink-dim"
        )}>
          <Bot className="size-4" />
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-medium text-ink">{rule.name}</h3>
            <Badge tone={isActive ? "positive" : "neutral"} dot size="xs">
              {isActive ? "Ativa" : "Pausada"}
            </Badge>
          </div>

          {/* Linguagem natural — esse é o coração da intuitividade */}
          <p className="text-xs text-ink-muted mt-1.5 leading-relaxed pretty">
            {naturalLanguage}
          </p>

          <div className="mt-3 flex items-center gap-3 text-2xs text-ink-dim flex-wrap">
            {lastRunRelative ? (
              <span className="inline-flex items-center gap-1">
                <Activity className="size-3" /> Última execução {lastRunRelative}
              </span>
            ) : (
              <span className="inline-flex items-center gap-1">
                <Clock className="size-3" /> Aguardando primeira execução
              </span>
            )}
            {rule.triggers_count > 0 && (
              <>
                <span className="opacity-40">·</span>
                <Badge tone="warning" size="xs">
                  <History className="size-2.5" /> {rule.triggers_count} disparo{rule.triggers_count === 1 ? "" : "s"}
                </Badge>
              </>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Switch checked={isActive} onCheckedChange={onToggle} />
          <DropdownMenu>
            <Tooltip>
              <TooltipTrigger asChild>
                <DropdownMenuTrigger asChild>
                  <button
                    type="button"
                    className="size-7 inline-flex items-center justify-center rounded text-ink-dim hover:text-ink hover:bg-bg-elevated transition-colors cursor-pointer"
                    aria-label="Mais ações"
                  >
                    <MoreHorizontal className="size-3.5" />
                  </button>
                </DropdownMenuTrigger>
              </TooltipTrigger>
              <TooltipContent>Mais ações</TooltipContent>
            </Tooltip>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onSelect={onEdit}>
                <Pencil /> Editar regra
              </DropdownMenuItem>
              <DropdownMenuItem onSelect={onDelete} className="text-negative">
                <Trash2 /> Excluir regra
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </div>
  );
}

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return "agora";
  if (min < 60) return `${min}min atrás`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h atrás`;
  const days = Math.floor(hr / 24);
  return `${days}d atrás`;
}
