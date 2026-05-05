"use client";

import * as React from "react";
import { Plus, Trash2, Loader2, Calculator, Lightbulb, AlertCircle } from "lucide-react";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
  DialogBody, DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/toast";
import { useCustomMetrics, type CustomMetric } from "@/lib/hooks/use-custom-metrics";
import { validateFormula, evalFormula } from "@/lib/formula";
import { brl, num, pct } from "@/lib/format";
import { cn } from "@/lib/cn";

const ALLOWED_VARS = [
  { id: "spend",       label: "Investimento" },
  { id: "revenue",     label: "Receita" },
  { id: "purchases",   label: "Compras" },
  { id: "impressions", label: "Impressões" },
  { id: "reach",       label: "Alcance" },
  { id: "clicks",      label: "Cliques" },
  { id: "ctr",         label: "CTR" },
  { id: "cpc",         label: "CPC" },
  { id: "cpm",         label: "CPM" },
  { id: "cpa",         label: "CPA" },
  { id: "roas",        label: "ROAS" },
  { id: "leads",       label: "Leads" },
  { id: "cpl",         label: "CPL" },
  { id: "cart_adds",   label: "Carrinhos" },
  { id: "checkouts",   label: "Finalizações" },
  { id: "messages",    label: "Mensagens" },
  { id: "cp_message",  label: "CP/Mensagem" },
  { id: "ig_visits",   label: "Visitas IG" },
];

const ALLOWED_VAR_IDS = ALLOWED_VARS.map((v) => v.id);

const SAMPLE = {
  spend: 1500, revenue: 4500, purchases: 30, impressions: 50000, reach: 30000,
  clicks: 850, ctr: 0.017, cpc: 1.76, cpm: 30, cpa: 50, roas: 3, leads: 12, cpl: 125,
  cart_adds: 80, checkouts: 35, messages: 0, cp_message: 0, ig_visits: 0,
} as Record<string, number>;

const PRESETS = [
  { label: "Lucro", formula: "revenue - spend", format: "currency" },
  { label: "Margem (%)", formula: "(revenue - spend) / revenue", format: "percent" },
  { label: "ROI (%)", formula: "(revenue - spend) / spend", format: "percent" },
  { label: "Ticket médio", formula: "revenue / purchases", format: "currency" },
  { label: "Carrinhos não convertidos", formula: "cart_adds - purchases", format: "number" },
];

function formatPreview(value: number, format: string): string {
  if (!isFinite(value)) return "—";
  if (format === "currency") return brl(value);
  if (format === "percent") return pct(value);
  if (format === "ratio") return value.toFixed(2) + "×";
  return num(Math.round(value));
}

export function CustomMetricsModal({
  open, onOpenChange, onChanged,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onChanged?: () => void;
}) {
  const { push } = useToast();
  const { metrics, refresh } = useCustomMetrics();
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [label, setLabel] = React.useState("");
  const [formula, setFormula] = React.useState("");
  const [format, setFormat] = React.useState<CustomMetric["format"]>("number");
  const [goodIsUp, setGoodIsUp] = React.useState(true);
  const [saving, setSaving] = React.useState(false);

  React.useEffect(() => {
    if (!open) {
      setEditingId(null); setLabel(""); setFormula(""); setFormat("number"); setGoodIsUp(true);
    }
  }, [open]);

  const startEdit = (m: CustomMetric) => {
    setEditingId(m.id);
    setLabel(m.label);
    setFormula(m.formula);
    setFormat(m.format);
    setGoodIsUp(m.good_is_up);
  };

  const reset = () => {
    setEditingId(null);
    setLabel(""); setFormula(""); setFormat("number"); setGoodIsUp(true);
  };

  const validation = React.useMemo(() => {
    if (!formula.trim()) return null;
    return validateFormula(formula, ALLOWED_VAR_IDS);
  }, [formula]);

  const preview = React.useMemo(() => {
    if (!validation?.ok) return null;
    try {
      const v = evalFormula(formula, SAMPLE);
      return formatPreview(v, format);
    } catch { return null; }
  }, [formula, format, validation]);

  const save = async () => {
    if (!label.trim()) { push({ tone: "warning", title: "Dê um nome à métrica" }); return; }
    if (!validation?.ok) { push({ tone: "warning", title: "Fórmula inválida", description: validation?.error }); return; }
    setSaving(true);
    try {
      const payload = { label: label.trim(), formula: formula.trim(), format, good_is_up: goodIsUp };
      const res = await fetch("/api/custom-metrics", {
        method: editingId ? "PATCH" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        push({ tone: "warning", title: "Falhou", description: json.detail ?? json.error });
        return;
      }
      push({ tone: "success", title: editingId ? "Métrica atualizada" : "Métrica criada", description: label });
      reset();
      await refresh();
      onChanged?.();
    } finally {
      setSaving(false);
    }
  };

  const remove = async (m: CustomMetric) => {
    if (!confirm(`Remover métrica "${m.label}"?`)) return;
    const res = await fetch(`/api/custom-metrics?id=${m.id}`, { method: "DELETE" });
    if (res.ok) {
      push({ tone: "info", title: "Métrica removida", description: m.label });
      await refresh();
      onChanged?.();
    }
  };

  const insertVar = (id: string) => {
    setFormula((f) => (f ? `${f} ${id}` : id));
  };

  const applyPreset = (p: typeof PRESETS[number]) => {
    setLabel(p.label);
    setFormula(p.formula);
    setFormat(p.format as any);
    setEditingId(null);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Calculator className="size-5 text-accent" />
            Métricas personalizadas
          </DialogTitle>
          <DialogDescription>
            Crie fórmulas combinando métricas existentes. Aparecem como colunas selecionáveis no gerenciador.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-5 overflow-y-auto">
          {/* Lista de métricas existentes */}
          {metrics.length > 0 && (
            <section className="space-y-2">
              <Label>Suas métricas ({metrics.length})</Label>
              <div className="rounded-md border border-line bg-bg-inset divide-y divide-line">
                {metrics.map((m) => (
                  <div
                    key={m.id}
                    className={cn(
                      "flex items-center gap-3 px-3 py-2.5 text-xs",
                      editingId === m.id && "bg-accent-subtle/30"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-ink truncate">{m.label}</p>
                      <p className="text-2xs text-ink-dim font-mono truncate mt-0.5">{m.formula}</p>
                    </div>
                    <Badge tone="neutral" size="xs">{m.format}</Badge>
                    <button
                      onClick={() => startEdit(m)}
                      className="text-2xs text-accent hover:underline cursor-pointer"
                    >
                      Editar
                    </button>
                    <button
                      onClick={() => remove(m)}
                      className="text-ink-dim hover:text-negative transition-colors p-1 cursor-pointer"
                      aria-label="Remover"
                    >
                      <Trash2 className="size-3" />
                    </button>
                  </div>
                ))}
              </div>
            </section>
          )}

          {/* Form de criar/editar */}
          <section className="rounded-lg border border-line bg-bg-surface p-4 space-y-4">
            <div className="flex items-center justify-between">
              <p className="text-sm font-medium text-ink">
                {editingId ? "Editar métrica" : "Nova métrica"}
              </p>
              {editingId && (
                <button onClick={reset} className="text-2xs text-ink-muted hover:text-ink">
                  Cancelar edição
                </button>
              )}
            </div>

            <div className="grid grid-cols-[2fr_1fr] gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="cm-label">Nome da métrica</Label>
                <Input
                  id="cm-label"
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="Ex: Lucro Líquido"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="cm-format">Formato</Label>
                <Select value={format} onValueChange={(v) => setFormat(v as any)}>
                  <SelectTrigger id="cm-format"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="currency">Moeda (R$)</SelectItem>
                    <SelectItem value="percent">Porcentagem (%)</SelectItem>
                    <SelectItem value="ratio">Multiplicador (×)</SelectItem>
                    <SelectItem value="number">Número</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="cm-formula">Fórmula</Label>
                {validation?.ok ? (
                  <span className="text-2xs text-positive">✓ Fórmula válida</span>
                ) : validation && !validation.ok ? (
                  <span className="text-2xs text-negative flex items-center gap-1">
                    <AlertCircle className="size-3" /> {validation.error}
                  </span>
                ) : null}
              </div>
              <textarea
                id="cm-formula"
                value={formula}
                onChange={(e) => setFormula(e.target.value)}
                rows={2}
                className="w-full rounded-md border border-line bg-bg-inset px-3 py-2 text-xs font-mono text-ink"
                placeholder="(revenue - spend) / spend"
              />
              <p className="text-2xs text-ink-muted">
                Operadores: <code>+ - * /</code> · Funções: <code>min</code>, <code>max</code>, <code>abs</code>, <code>if</code>
              </p>
            </div>

            {/* Preview */}
            {preview && (
              <div className="rounded-md border border-positive/30 bg-positive-subtle/15 p-3 text-2xs">
                <p className="font-medium text-ink">
                  Preview com dados de exemplo:{" "}
                  <span className="text-positive font-mono">{preview}</span>
                </p>
                <p className="text-ink-muted mt-0.5">
                  (spend=R$1.500, revenue=R$4.500, purchases=30, impressions=50k, etc.)
                </p>
              </div>
            )}

            {/* Variáveis disponíveis */}
            <div className="space-y-1.5">
              <Label>Inserir variável <span className="text-ink-dim font-normal">(clique pra adicionar)</span></Label>
              <div className="flex flex-wrap gap-1.5">
                {ALLOWED_VARS.map((v) => (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => insertVar(v.id)}
                    className="text-2xs font-mono px-2 py-1 rounded border border-line bg-bg-inset text-ink-muted hover:border-accent hover:text-accent transition-colors cursor-pointer"
                  >
                    {v.id}
                  </button>
                ))}
              </div>
            </div>

            {/* Presets */}
            <div className="space-y-1.5">
              <Label>Presets <span className="text-ink-dim font-normal">(começa rápido)</span></Label>
              <div className="flex flex-wrap gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="text-2xs px-2.5 py-1 rounded border border-line bg-bg-inset text-ink-muted hover:border-accent hover:text-accent transition-colors cursor-pointer inline-flex items-center gap-1"
                  >
                    <Lightbulb className="size-2.5" />
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <label className="flex items-center justify-between gap-2 text-2xs cursor-pointer pt-2 border-t border-line">
              <div>
                <p className="text-ink font-medium">Valores maiores são bons</p>
                <p className="text-ink-muted">Pra colorização (verde se sobe, vermelho se desce). Desmarque pra métricas onde menor é melhor (ex: custo).</p>
              </div>
              <Switch checked={goodIsUp} onCheckedChange={setGoodIsUp} />
            </label>
          </section>
        </DialogBody>

        <DialogFooter>
          <Button variant="secondary" onClick={() => onOpenChange(false)}>Fechar</Button>
          <Button
            variant="primary"
            disabled={!label.trim() || !validation?.ok || saving}
            onClick={save}
          >
            {saving ? <Loader2 className="size-4 mr-1 animate-spin" /> : <Plus className="size-4 mr-1" />}
            {editingId ? "Salvar alterações" : "Criar métrica"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
