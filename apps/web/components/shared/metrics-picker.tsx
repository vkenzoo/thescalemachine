"use client";

import * as React from "react";
import { Search, Calculator, Plus } from "lucide-react";
import { useCustomMetrics } from "@/lib/hooks/use-custom-metrics";
import { CustomMetricsModal } from "@/components/shared/custom-metrics-modal";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { METRICS, METRIC_CATEGORY_LABELS, type MetricDef } from "@/lib/mock-data";
import { cn } from "@/lib/cn";
import { useToast } from "@/components/ui/toast";

const MAX = 12;

export function MetricsPicker({
  open,
  onOpenChange,
  defaultSelected,
  onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  defaultSelected?: string[];
  onSave?: (ids: string[]) => void;
}) {
  const { push } = useToast();
  const [query, setQuery] = React.useState("");
  const [selected, setSelected] = React.useState<Set<string>>(
    new Set(defaultSelected ?? ["spend", "revenue", "roas", "purchases", "cpa", "ctr"])
  );
  const [customOpen, setCustomOpen] = React.useState(false);

  const { metrics: customMetrics } = useCustomMetrics();

  React.useEffect(() => {
    if (open) setSelected(new Set(defaultSelected ?? ["spend", "revenue", "roas", "purchases", "cpa", "ctr"]));
  }, [open, defaultSelected]);

  // Combina built-in + custom (custom usa categoria virtual "custom")
  const allMetrics: (MetricDef & { isCustom?: boolean })[] = React.useMemo(() => [
    ...METRICS,
    ...customMetrics.map((c) => ({
      id: c.key, label: c.label, format: c.format,
      category: "custom" as any,
      goodIsUp: c.good_is_up,
      isCustom: true,
    })),
  ], [customMetrics]);

  const filtered = React.useMemo(
    () => allMetrics.filter((m) => m.label.toLowerCase().includes(query.toLowerCase())),
    [allMetrics, query]
  );

  const grouped = React.useMemo(() => {
    const map = new Map<string, typeof allMetrics>();
    for (const m of filtered) {
      const arr = map.get(m.category as any) ?? [];
      arr.push(m);
      map.set(m.category as any, arr);
    }
    return map;
  }, [filtered]);

  const toggle = (id: string) => {
    setSelected((curr) => {
      const next = new Set(curr);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX) next.add(id);
      else push({ tone: "warning", title: `Limite de ${MAX} métricas atingido`, description: "Desmarque uma para escolher outra." });
      return next;
    });
  };

  const remaining = MAX - selected.size;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Resumo do Período — métricas</DialogTitle>
          <DialogDescription>
            Escolha até <strong className="text-ink font-medium">{MAX}</strong> métricas para os cards no topo do gerenciador.
            A configuração é salva por conta.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ink-dim pointer-events-none" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Buscar métrica…"
                className="pl-8 h-8 text-xs"
              />
            </div>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setCustomOpen(true)}
              className="h-8"
            >
              <Calculator className="size-3.5 mr-1" />
              {customMetrics.length > 0 ? `Personalizadas (${customMetrics.length})` : "Criar personalizada"}
            </Button>
            <Badge tone={remaining === 0 ? "warning" : "neutral"} size="sm">
              {selected.size}/{MAX} selecionadas
            </Badge>
          </div>

          <div className="max-h-[420px] overflow-y-auto space-y-5 pr-1 -mr-1">
            {Array.from(grouped.entries()).map(([cat, metrics]) => (
              <div key={cat}>
                <p className="eyebrow mb-2.5">{METRIC_CATEGORY_LABELS[cat]}</p>
                <div className="grid grid-cols-2 gap-1">
                  {metrics.map((m) => {
                    const isSel = selected.has(m.id);
                    return (
                      <label
                        key={m.id}
                        className={cn(
                          "flex items-center gap-2.5 px-2.5 py-2 rounded-md text-xs cursor-pointer transition-colors",
                          "border border-transparent",
                          isSel
                            ? "border-accent/30 bg-accent-subtle/30 text-ink"
                            : "hover:bg-bg-elevated text-ink-muted"
                        )}
                      >
                        <Checkbox checked={isSel} onCheckedChange={() => toggle(m.id)} />
                        <span className="flex-1">{m.label}</span>
                        <span className="text-2xs font-mono text-ink-dim uppercase">{m.format}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            ))}
            {filtered.length === 0 && (
              <p className="text-center text-xs text-ink-dim py-8">Nenhuma métrica encontrada para "{query}"</p>
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button
            variant="primary"
            onClick={() => {
              onSave?.(Array.from(selected));
              push({ tone: "success", title: "Métricas atualizadas" });
              onOpenChange(false);
            }}
          >
            Aplicar ({selected.size})
          </Button>
        </DialogFooter>

        <CustomMetricsModal
          open={customOpen}
          onOpenChange={setCustomOpen}
        />
      </DialogContent>
    </Dialog>
  );
}
