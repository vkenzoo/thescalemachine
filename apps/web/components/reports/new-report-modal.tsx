"use client";

import * as React from "react";
import { Save, X, Lock, Globe, Layers, BarChart3, PieChart, Trophy } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogBody,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { RadioGroup, RadioOption } from "@/components/ui/radio";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { cn } from "@/lib/cn";
import { useMetaAccounts } from "@/lib/hooks/use-meta";

const META_METRICS = [
  "Gasto", "Impressões", "Alcance", "Cliques", "CTR", "CPM", "CPC", "Frequência",
  "Resultados", "Custo por Resultado", "ROAS", "Compras", "Custo/Compra", "Valor Conversão",
  "Leads", "Custo/Lead", "Mensagens", "Custo/Mensagem", "Visitas IG", "Custo/Visita IG",
  "Carrinho", "Custo/Carrinho", "Fin. Compra", "Custo/Fin. Compra", "Ações (todas)", "Valor das Ações",
  "Custo por Ação", "Compras UTMs", "Faturamento UTMs", "Lucro",
];

const SECTIONS = [
  { id: "funnel",   label: "Funil de Conversão",  icon: Layers,  description: "Visualização vertical do funil com passos selecionáveis." },
  { id: "perf",     label: "Gráfico de Performance", icon: BarChart3, description: "Linha temporal com métrica principal do período." },
  { id: "pie",      label: "Distribuição (Pizza)", icon: PieChart, description: "Proporção entre campanhas para uma métrica." },
  { id: "topCamp",  label: "Melhores Campanhas (Top 3)", icon: Trophy, description: "Ranking das 3 melhores campanhas." },
  { id: "topAds",   label: "Melhores Anúncios (Top 3)",  icon: Trophy, description: "Ranking dos 3 melhores anúncios." },
];

const FUNNEL_STEPS = [
  "Impressões", "Alcance", "Cliques", "Resultados", "Compras",
  "Leads", "Mensagens", "Visitas IG", "Carrinho", "Fin. Compra", "Compras UTMs",
];

export interface ReportEditPayload {
  id: string;
  name: string;
  level: string;
  accounts: string[];
  metrics: string[];
  sections: string[];
  funnel_steps: string[];
  ig_account: string | null;
  is_public: boolean;
}

export function NewReportModal({
  open,
  onOpenChange,
  onCreated,
  editing,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onCreated?: () => void;
  editing?: ReportEditPayload | null;
}) {
  const { push } = useToast();
  const { accounts: metaAccounts } = useMetaAccounts();
  const [saving, setSaving] = React.useState(false);
  const isEditing = !!editing && !!editing.id;
  // editing com id="" significa "pré-popular para criação" (a partir de template)
  const [name, setName] = React.useState("");
  const [accounts, setAccounts] = React.useState<Set<string>>(new Set());
  const [igAccount, setIgAccount] = React.useState<string>("");
  const [level, setLevel] = React.useState("Campanhas");
  const [metaSel, setMetaSel] = React.useState<Set<string>>(
    new Set(["Gasto", "Impressões", "Alcance", "Cliques", "CTR", "CPM", "CPC", "ROAS", "Compras", "Custo/Compra"])
  );
  const [sectionsOn, setSectionsOn] = React.useState<Set<string>>(new Set(["funnel", "perf", "topCamp"]));
  const [funnelSteps, setFunnelSteps] = React.useState<Set<string>>(
    new Set(["Impressões", "Cliques", "Compras"])
  );
  const [access, setAccess] = React.useState<"public" | "protected">("public");

  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      setName(editing.name);
      setAccounts(new Set(editing.accounts));
      setLevel(editing.level);
      setMetaSel(new Set(editing.metrics));
      setSectionsOn(new Set(editing.sections));
      setFunnelSteps(new Set(editing.funnel_steps));
      setIgAccount(editing.ig_account ?? "");
      setAccess(editing.is_public ? "public" : "protected");
    } else {
      setName("");
      setAccounts(new Set());
    }
  }, [open, editing]);

  const toggle = <T,>(set: Set<T>, key: T, setter: (s: Set<T>) => void) => {
    const next = new Set(set);
    if (next.has(key)) next.delete(key);
    else next.add(key);
    setter(next);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar Relatório" : "Novo Relatório"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Ajuste métricas, contas e seções do relatório existente."
              : "Crie um relatório white-label compartilhável com seus clientes via link."}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-6 overflow-y-auto">
          {/* Identificação */}
          <div className="space-y-1.5">
            <Label htmlFor="rp-name">Nome do relatório <span className="text-negative">*</span></Label>
            <Input
              id="rp-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Performance Agosto 2026 — Cliente X"
            />
          </div>

          <Separator />

          {/* Contas Meta */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Contas Meta Ads</Label>
              <span className="text-2xs text-ink-dim">{accounts.size} selecionadas</span>
            </div>
            <div className="rounded-md border border-line bg-bg-inset max-h-40 overflow-y-auto">
              {metaAccounts.length === 0 ? (
                <p className="px-3 py-3 text-2xs text-ink-muted">
                  Nenhuma conta Meta sincronizada. Conecte em /connect primeiro.
                </p>
              ) : metaAccounts.map((a) => (
                <label
                  key={a.account_id}
                  className="flex items-center gap-2.5 px-3 py-2 hover:bg-bg-elevated cursor-pointer text-xs border-b border-line/40 last:border-b-0"
                >
                  <Checkbox
                    checked={accounts.has(a.account_id)}
                    onCheckedChange={() => toggle(accounts, a.account_id, setAccounts)}
                  />
                  <span className="text-ink truncate flex-1">{a.name}</span>
                  <span className="font-mono text-2xs text-ink-dim">{a.account_id}</span>
                </label>
              ))}
            </div>
            <p className="text-2xs text-ink-dim">Os dados serão consolidados no relatório.</p>
          </div>

          {/* Conta Instagram opcional */}
          <div className="space-y-1.5">
            <Label htmlFor="rp-ig">Conta Instagram (opcional)</Label>
            <Input
              id="rp-ig"
              value={igAccount}
              onChange={(e) => setIgAccount(e.target.value)}
              placeholder="@conta_business"
            />
            <p className="text-2xs text-ink-dim">
              Selecione uma conta Business/Creator para incluir insights do Instagram no relatório.
            </p>
          </div>

          {/* Nível */}
          <div className="space-y-1.5">
            <Label>Nível de dados</Label>
            <Select value={level} onValueChange={setLevel}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="Campanhas">Campanhas</SelectItem>
                <SelectItem value="Conjuntos de Anúncios">Conjuntos de Anúncios</SelectItem>
                <SelectItem value="Anúncios">Anúncios</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Separator />

          {/* Métricas Meta */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Métricas a exibir</Label>
              <Badge tone="info" size="xs">{metaSel.size} de {META_METRICS.length}</Badge>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 rounded-md border border-line bg-bg-inset p-3">
              {META_METRICS.map((m) => {
                const isSel = metaSel.has(m);
                return (
                  <label
                    key={m}
                    className={cn(
                      "flex items-center gap-2 px-2 py-1 rounded cursor-pointer text-xs transition-colors",
                      isSel ? "text-ink" : "text-ink-muted hover:text-ink"
                    )}
                  >
                    <Checkbox checked={isSel} onCheckedChange={() => toggle(metaSel, m, setMetaSel)} />
                    {m}
                  </label>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Seções */}
          <div className="space-y-3">
            <Label>Seções do relatório</Label>
            <div className="space-y-2">
              {SECTIONS.map((s) => {
                const SIcon = s.icon;
                const enabled = sectionsOn.has(s.id);
                return (
                  <div
                    key={s.id}
                    className={cn(
                      "rounded-md border p-3 transition-colors",
                      enabled ? "border-accent/30 bg-accent-subtle/20" : "border-line bg-bg-surface"
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <SIcon className={cn("size-4 shrink-0", enabled ? "text-accent" : "text-ink-dim")} />
                      <div className="flex-1 min-w-0">
                        <p className={cn("text-sm font-medium", enabled ? "text-ink" : "text-ink-muted")}>
                          {s.label}
                        </p>
                        <p className="text-2xs text-ink-dim mt-0.5">{s.description}</p>
                      </div>
                      <Switch checked={enabled} onCheckedChange={() => toggle(sectionsOn, s.id, setSectionsOn)} />
                    </div>
                    {enabled && s.id === "funnel" && (
                      <div className="mt-3 pl-7">
                        <p className="text-2xs text-ink-dim mb-1.5">Etapas do funil:</p>
                        <div className="flex flex-wrap gap-1">
                          {FUNNEL_STEPS.map((f) => (
                            <button
                              key={f}
                              type="button"
                              onClick={() => toggle(funnelSteps, f, setFunnelSteps)}
                              className={cn(
                                "h-6 px-2 rounded text-2xs font-medium transition-colors cursor-pointer",
                                funnelSteps.has(f)
                                  ? "bg-accent text-ink-inverse"
                                  : "bg-bg-inset text-ink-muted border border-line hover:border-line-strong"
                              )}
                            >
                              {f}
                            </button>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <Separator />

          {/* Acesso */}
          <div className="space-y-2">
            <Label>Acesso ao relatório</Label>
            <RadioGroup value={access} onChange={(v) => setAccess(v as any)}>
              <RadioOption
                value="public"
                label="Público"
                description="Qualquer pessoa com o link pode ver. Útil para clientes e equipe."
                icon={Globe}
              />
              <RadioOption
                value="protected"
                label="Protegido por senha"
                description="Defina uma senha que o destinatário precisa inserir antes de visualizar."
                icon={Lock}
              />
            </RadioGroup>
            {access === "protected" && (
              <Input type="password" placeholder="Senha do relatório" mono className="mt-2" />
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="secondary"
            onClick={() => push({ tone: "info", title: "Configuração salva como template" })}
          >
            <Save /> Salvar como template
          </Button>
          <Button
            variant="primary"
            disabled={!name || accounts.size === 0 || saving}
            onClick={async () => {
              setSaving(true);
              try {
                const payload = {
                  name,
                  level,
                  accounts: Array.from(accounts),
                  metrics: Array.from(metaSel),
                  sections: Array.from(sectionsOn),
                  funnel_steps: Array.from(funnelSteps),
                  ig_account: igAccount || null,
                  is_public: access === "public",
                };
                const res = await fetch("/api/reports", {
                  method: isEditing ? "PATCH" : "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify(isEditing ? { id: editing!.id, ...payload } : payload),
                });
                const json = await res.json();
                if (!res.ok || json.error) {
                  push({ tone: "warning", title: "Falhou", description: json.detail ?? json.error });
                  return;
                }
                push({
                  tone: "success",
                  title: isEditing ? "Relatório atualizado" : "Relatório criado",
                  description: isEditing ? name : ("Link: /r/" + json.report.slug),
                });
                onOpenChange(false);
                onCreated?.();
              } finally {
                setSaving(false);
              }
            }}
          >
            {saving ? "Salvando…" : (isEditing ? "Salvar alterações" : "Criar Relatório")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
