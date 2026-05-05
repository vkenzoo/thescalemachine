"use client";

import * as React from "react";
import { Plus, Trash2, Calendar, Repeat, Clock, Target, Sparkles } from "lucide-react";
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useToast } from "@/components/ui/toast";
import { createRule, updateRule, type Rule } from "@/lib/hooks/use-automation";
import { formatMetric } from "@/lib/automation-format";

// ============================================================
// Definições — IDs alinhados com o DB
// ============================================================
const METRICS = [
  { id: "spend", label: "Gasto" },
  { id: "cost_per_result", label: "Custo por Resultado" },
  { id: "cost_per_lead", label: "Custo por Lead" },
  { id: "cost_per_purchase", label: "Custo por Compra" },
  { id: "cost_per_message", label: "Custo por Mensagem (WhatsApp)" },
  { id: "cpa", label: "CPA (todas conversões)" },
  { id: "roi", label: "ROI" },
  { id: "roas", label: "ROAS" },
  { id: "profit", label: "Lucro" },
  { id: "margin", label: "Margem de Lucro" },
  { id: "cpc", label: "CPC" },
  { id: "budget", label: "Orçamento" },
  { id: "cpi", label: "CPI" },
  { id: "sales", label: "Vendas" },
  { id: "utm_purchases", label: "Compras UTMs" },
  { id: "leads", label: "Leads" },
  { id: "messages", label: "Mensagens (WhatsApp)" },
  { id: "ics", label: "ICs (Iniciar Conversa)" },
  { id: "ctr", label: "CTR" },
  { id: "cpm", label: "CPM" },
  { id: "clicks", label: "Cliques" },
  { id: "conversations", label: "Conversas" },
  { id: "cost_per_conversation", label: "Custo por Conversa" },
  { id: "cpl", label: "CPL" },
  { id: "cpv", label: "CPV" },
  { id: "page_views", label: "Visualizações de Página" },
  { id: "frequency", label: "Frequência" },
];

const OPERATORS = [
  { id: "gt",  label: "Maior que (>)" },
  { id: "lt",  label: "Menor que (<)" },
  { id: "gte", label: "Maior ou igual a (≥)" },
  { id: "lte", label: "Menor ou igual a (≤)" },
];

const PERIODS = [
  { id: "today",        label: "Hoje" },
  { id: "yesterday",    label: "Ontem" },
  { id: "last_3d",      label: "Últimos 3 dias" },
  { id: "last_7d_inc",  label: "Últimos 7 dias incluindo hoje" },
  { id: "last_7d_exc",  label: "Últimos 7 dias excluindo hoje" },
  { id: "last_7d",      label: "Últimos 7 dias" },
  { id: "last_14d",     label: "Últimos 14 dias" },
  { id: "last_30d",     label: "Últimos 30 dias" },
];

const FREQUENCIES = [
  { id: "10min", label: "A cada 10 minutos" },
  { id: "15min", label: "A cada 15 minutos" },
  { id: "30min", label: "A cada 30 minutos" },
  { id: "1h",    label: "A cada 1 hora" },
  { id: "2h",    label: "A cada 2 horas" },
  { id: "3h",    label: "A cada 3 horas" },
  { id: "6h",    label: "A cada 6 horas" },
  { id: "daily", label: "Uma vez por dia" },
];

const SCOPES = [
  "Campanhas Ativas",
  "Campanhas Pausadas",
  "Conjuntos Ativos",
  "Conjuntos Pausados",
  "Anúncios Ativos",
  "Anúncios Pausados",
];

const NAME_FILTERS = [
  { id: "any",          label: "Qualquer" },
  { id: "contains",     label: "Contém" },
  { id: "not_contains", label: "Não contém" },
  { id: "starts_with",  label: "Começa com" },
];

const ACTIONS = [
  { id: "pause",            label: "Pausar",                 needsValue: false },
  { id: "activate",         label: "Ativar",                 needsValue: false },
  { id: "increase_budget",  label: "Aumentar Orçamento",     needsValue: true },
  { id: "decrease_budget",  label: "Diminuir Orçamento",     needsValue: true },
  { id: "set_budget",       label: "Definir Orçamento Fixo", needsValue: true },
];

interface Condition {
  id: string;
  metric: string;
  op: string;
  value: string;
}

const newCondition = (metric = METRICS[0].id): Condition => ({
  id: Math.random().toString(36).slice(2),
  metric,
  op: "gt",
  value: "",
});

interface PrefilledPreset {
  name?: string;
  scope?: string;
  action?: string;
  action_value?: number;
  action_unit?: "pct" | "abs";
  conditions?: { metric: string; op: string; value: number }[];
  period?: string;
  frequency?: string;
}

export function NewRuleModal({
  open,
  onOpenChange,
  prefilled,
  editing,
  onCreated,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  prefilled?: PrefilledPreset | null;
  editing?: Rule | null;
  onCreated?: () => void | Promise<void>;
}) {
  const isEditing = !!editing;
  const { push } = useToast();
  const [name, setName] = React.useState("");
  const [scope, setScope] = React.useState<string>(SCOPES[0]);
  const [nameFilterOp, setNameFilterOp] = React.useState<string>("any");
  const [nameFilterText, setNameFilterText] = React.useState("");
  const [action, setAction] = React.useState<string>(ACTIONS[0].id);
  const [actionValue, setActionValue] = React.useState("");
  const [actionUnit, setActionUnit] = React.useState<"pct" | "abs">("pct");
  const [conditions, setConditions] = React.useState<Condition[]>([newCondition()]);
  const [period, setPeriod] = React.useState<string>("last_7d");
  const [frequency, setFrequency] = React.useState<string>("30min");
  const [dailyLimit, setDailyLimit] = React.useState<string>("unlimited");
  const [saving, setSaving] = React.useState(false);

  // Reset / aplica template / aplica editing quando abre
  React.useEffect(() => {
    if (!open) return;
    if (editing) {
      const r: any = editing;
      setName(r.name ?? "");
      setScope(r.scope ?? SCOPES[0]);
      setNameFilterOp(r.name_filter_op ?? "any");
      setNameFilterText(r.name_filter_text ?? "");
      setAction(r.action ?? ACTIONS[0].id);
      setActionValue(r.action_value != null ? String(r.action_value) : "");
      setActionUnit(r.action_unit ?? "pct");
      setConditions(
        Array.isArray(r.conditions) && r.conditions.length > 0
          ? r.conditions.map((c: any) => ({
              id: Math.random().toString(36).slice(2),
              metric: c.metric, op: c.op, value: String(c.value),
            }))
          : [newCondition()]
      );
      setPeriod(r.period ?? "last_7d");
      setFrequency(r.frequency ?? "30min");
      setDailyLimit(r.daily_limit != null ? String(r.daily_limit) : "unlimited");
      setSaving(false);
      return;
    }
    if (prefilled) {
      setName(prefilled.name ?? "");
      setScope(prefilled.scope ?? SCOPES[0]);
      setAction(prefilled.action ?? ACTIONS[0].id);
      setActionValue(prefilled.action_value != null ? String(prefilled.action_value) : "");
      setActionUnit(prefilled.action_unit ?? "pct");
      setConditions(
        prefilled.conditions?.map((c) => ({
          id: Math.random().toString(36).slice(2),
          metric: c.metric,
          op: c.op,
          value: String(c.value),
        })) ?? [newCondition()]
      );
      setPeriod(prefilled.period ?? "last_7d");
      setFrequency(prefilled.frequency ?? "30min");
      setNameFilterOp("any");
      setNameFilterText("");
    } else {
      setName("");
      setScope(SCOPES[0]);
      setAction(ACTIONS[0].id);
      setActionValue("");
      setActionUnit("pct");
      setConditions([newCondition()]);
      setPeriod("last_7d");
      setFrequency("30min");
      setNameFilterOp("any");
      setNameFilterText("");
    }
    setDailyLimit("unlimited");
    setSaving(false);
  }, [open, prefilled, editing]);

  const selectedAction = ACTIONS.find((a) => a.id === action)!;
  const needsValue = !!selectedAction.needsValue;

  const addCondition = () => setConditions((c) => [...c, newCondition()]);
  const removeCondition = (id: string) =>
    setConditions((c) => (c.length > 1 ? c.filter((x) => x.id !== id) : c));
  const updateCondition = (id: string, patch: Partial<Condition>) =>
    setConditions((c) => c.map((x) => (x.id === id ? { ...x, ...patch } : x)));

  // Preview em linguagem natural — atualiza enquanto user edita
  const previewText = React.useMemo(() => {
    const validConds = conditions.filter((c) => c.value.trim());
    if (!validConds.length) return null;
    const actionLabel = selectedAction.label;
    const condText = validConds
      .map((c) => {
        const m = METRICS.find((x) => x.id === c.metric);
        const o = OPERATORS.find((x) => x.id === c.op);
        return `${m?.label ?? c.metric} ${o?.label.replace(/[\(\)<>=≥≤]/g, "").trim() ?? c.op} ${c.value}`;
      })
      .join(" e ");
    const periodLabel = PERIODS.find((p) => p.id === period)?.label.toLowerCase() ?? "";
    const freqLabel = FREQUENCIES.find((f) => f.id === frequency)?.label.toLowerCase() ?? "";
    return `${actionLabel} ${scope.toLowerCase()} quando ${condText} ${periodLabel}. Verifica ${freqLabel}.`;
  }, [conditions, selectedAction, scope, period, frequency]);

  const canSubmit = !!name && conditions.every((c) => c.value.trim()) && !saving;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setSaving(true);
    try {
      const payload = {
        name,
        scope,
        name_filter_op: nameFilterOp as any,
        name_filter_text: nameFilterText,
        action: action as any,
        action_value: actionValue ? parseFloat(actionValue) : null,
        action_unit: actionUnit,
        conditions: conditions.map((c) => ({
          metric: c.metric,
          op: c.op,
          value: parseFloat(c.value),
        })),
        period,
        frequency,
        daily_limit: dailyLimit === "unlimited" ? null : parseInt(dailyLimit),
      };
      if (isEditing && editing?.id) {
        await updateRule(editing.id, payload as any);
        push({ tone: "success", title: "Regra atualizada", description: name });
      } else {
        await createRule(payload as any);
        push({ tone: "success", title: "Regra criada", description: name });
      }
      await onCreated?.();
      onOpenChange(false);
    } catch (e: any) {
      push({ tone: "danger", title: isEditing ? "Erro ao atualizar regra" : "Erro ao criar regra", description: e.message });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Editar regra" : prefilled ? "Personalizar template" : "Nova regra automatizada"}</DialogTitle>
          <DialogDescription>
            Defina o que ela faz, quando ela faz, e ela passa a rodar sozinha em segundo plano.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-6 overflow-y-auto">
          {/* IDENTIFICAÇÃO */}
          <Section title="Identificação" icon={Target}>
            <div className="space-y-1.5">
              <Label htmlFor="rule-name">Nome da regra</Label>
              <Input
                id="rule-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Pausar quando CPA > R$ 50"
              />
            </div>
          </Section>

          {/* ESCOPO */}
          <Section title="Em qual nível aplicar" icon={Target}>
            <div className="space-y-1.5">
              <Label>Aplicar regra a</Label>
              <Select value={scope} onValueChange={setScope}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {SCOPES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-[1fr_2fr] gap-2">
              <div className="space-y-1.5">
                <Label>Filtrar por nome</Label>
                <Select value={nameFilterOp} onValueChange={setNameFilterOp}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {NAME_FILTERS.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {nameFilterOp !== "any" && (
                <div className="space-y-1.5">
                  <Label>Texto</Label>
                  <Input
                    value={nameFilterText}
                    onChange={(e) => setNameFilterText(e.target.value)}
                    placeholder="Ex: Black Friday"
                  />
                </div>
              )}
            </div>
          </Section>

          {/* AÇÃO */}
          <Section title="O que fazer" icon={Repeat}>
            <div className="grid grid-cols-[1.4fr_1fr] gap-2">
              <div className="space-y-1.5">
                <Label>Ação a executar</Label>
                <Select value={action} onValueChange={setAction}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIONS.map((a) => (
                      <SelectItem key={a.id} value={a.id}>{a.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {needsValue && (
                <div className="space-y-1.5">
                  <Label>Valor</Label>
                  <div className="flex items-center gap-2">
                    <Input
                      type="number"
                      value={actionValue}
                      onChange={(e) => setActionValue(e.target.value)}
                      placeholder="Ex: 25"
                      mono
                      className="flex-1"
                    />
                    <div className="inline-flex rounded-md border border-line bg-bg-surface overflow-hidden h-9">
                      {(["pct", "abs"] as const).map((u) => (
                        <button
                          key={u}
                          type="button"
                          onClick={() => setActionUnit(u)}
                          className={`px-3 text-xs font-medium transition-colors cursor-pointer ${
                            actionUnit === u ? "bg-accent text-ink-inverse" : "text-ink-muted hover:text-ink hover:bg-bg-elevated"
                          }`}
                        >
                          {u === "pct" ? "%" : "R$"}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </Section>

          {/* CONDIÇÕES */}
          <Section title="Quando disparar" icon={Target}>
            <div className="space-y-2">
              {conditions.map((c, i) => (
                <div key={c.id} className="grid grid-cols-[1.6fr_1.2fr_1fr_auto] gap-2 items-start">
                  <div className="space-y-1">
                    {i === 0 && <Label className="text-2xs">Métrica</Label>}
                    <Select value={c.metric} onValueChange={(v) => updateCondition(c.id, { metric: v })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {METRICS.map((m) => (
                          <SelectItem key={m.id} value={m.id}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    {i === 0 && <Label className="text-2xs">Operador</Label>}
                    <Select value={c.op} onValueChange={(v) => updateCondition(c.id, { op: v })}>
                      <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {OPERATORS.map((o) => (
                          <SelectItem key={o.id} value={o.id}>{o.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    {i === 0 && <Label className="text-2xs">Valor</Label>}
                    <Input
                      type="number"
                      value={c.value}
                      onChange={(e) => updateCondition(c.id, { value: e.target.value })}
                      placeholder="50"
                      mono
                      className="h-9"
                    />
                  </div>
                  <div className={i === 0 ? "pt-5" : ""}>
                    <button
                      type="button"
                      onClick={() => removeCondition(c.id)}
                      disabled={conditions.length === 1}
                      className="size-9 grid place-items-center rounded-md text-ink-dim hover:text-negative hover:bg-negative-subtle/40 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer transition-colors"
                      aria-label="Remover condição"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={addCondition}
                className="w-full h-9 rounded-md border border-dashed border-line text-xs font-medium text-ink-muted hover:text-accent hover:border-accent/40 hover:bg-accent-subtle/20 transition-colors cursor-pointer inline-flex items-center justify-center gap-1.5"
              >
                <Plus className="size-3.5" /> Adicionar condição
              </button>
              {conditions.length > 1 && (
                <p className="text-2xs text-ink-dim text-center">Todas as condições devem ser verdadeiras (E).</p>
              )}
            </div>
          </Section>

          {/* PROGRAMAÇÃO */}
          <Section title="Quando verificar" icon={Calendar}>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1.5">
                <Label>Período de cálculo</Label>
                <Select value={period} onValueChange={setPeriod}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIODS.map((p) => (
                      <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Frequência</Label>
                <Select value={frequency} onValueChange={setFrequency}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {FREQUENCIES.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label>Limite diário de execuções</Label>
              <Select value={dailyLimit} onValueChange={setDailyLimit}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="unlimited">Sem limite</SelectItem>
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                    <SelectItem key={n} value={String(n)}>{n} {n === 1 ? "execução" : "execuções"}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </Section>

          {/* PREVIEW EM LINGUAGEM NATURAL */}
          {previewText && (
            <div className="rounded-lg border border-accent/30 bg-accent-subtle/20 p-4 space-y-1.5">
              <div className="flex items-center gap-2">
                <Sparkles className="size-3.5 text-accent" />
                <p className="text-2xs font-semibold uppercase tracking-wider text-accent">
                  Como vai funcionar
                </p>
              </div>
              <p className="text-sm text-ink leading-relaxed pretty">
                {previewText}
              </p>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            disabled={!canSubmit}
            loading={saving}
            onClick={handleSubmit}
          >
            {isEditing ? "Salvar alterações" : "Criar regra"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Section({
  title,
  icon: Icon,
  children,
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="size-3.5 text-accent" />
        <h3 className="text-2xs font-semibold uppercase tracking-wider text-ink">{title}</h3>
        <Separator className="flex-1" />
      </div>
      <div className="space-y-3 pl-5">{children}</div>
    </div>
  );
}
