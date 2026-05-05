"use client";

import * as React from "react";
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
import { brl } from "@/lib/format";
import { cn } from "@/lib/cn";
import { TrendingUp, TrendingDown } from "lucide-react";

const PRESETS = [10, 15, 25, 35] as const;

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Nome do item editado (campanha ou conjunto) — só pra display */
  targetName: string;
  /** "campanha" | "conjunto" */
  targetType: "campanha" | "conjunto";
  /** Orçamento diário atual em BRL */
  currentDailyBudget: number;
  /** Chamado quando user confirma. Recebe novo valor em BRL. */
  onSave: (newDailyBudget: number) => Promise<void> | void;
}

export function EditBudgetModal({
  open,
  onOpenChange,
  targetName,
  targetType,
  currentDailyBudget,
  onSave,
}: Props) {
  const [mode, setMode] = React.useState<"preset" | "custom">("preset");
  const [direction, setDirection] = React.useState<"up" | "down">("up");
  const [presetPct, setPresetPct] = React.useState<number>(15);
  const [custom, setCustom] = React.useState<string>("");
  const [saving, setSaving] = React.useState(false);

  // Reset state quando reabre
  React.useEffect(() => {
    if (open) {
      setMode("preset");
      setDirection("up");
      setPresetPct(15);
      setCustom(String(currentDailyBudget.toFixed(2)).replace(".", ","));
      setSaving(false);
    }
  }, [open, currentDailyBudget]);

  const computedNew = React.useMemo(() => {
    if (mode === "preset") {
      const factor = direction === "up" ? 1 + presetPct / 100 : 1 - presetPct / 100;
      return Math.max(0, currentDailyBudget * factor);
    }
    const parsed = parseFloat(custom.replace(",", "."));
    return isNaN(parsed) ? currentDailyBudget : Math.max(0, parsed);
  }, [mode, direction, presetPct, custom, currentDailyBudget]);

  const delta = computedNew - currentDailyBudget;
  const deltaPct = currentDailyBudget > 0 ? (delta / currentDailyBudget) * 100 : 0;

  const handleSubmit = async () => {
    setSaving(true);
    try {
      await onSave(computedNew);
      onOpenChange(false);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Editar orçamento</DialogTitle>
          <DialogDescription className="truncate" title={targetName}>
            {targetType === "campanha" ? "Campanha" : "Conjunto"}: {targetName}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Mode tabs */}
          <div className="grid grid-cols-2 gap-1 p-1 bg-bg-inset rounded-md">
            <button
              type="button"
              onClick={() => setMode("preset")}
              className={cn(
                "h-7 rounded text-xs font-medium transition-colors",
                mode === "preset" ? "bg-bg-surface text-ink shadow-sm" : "text-ink-dim hover:text-ink"
              )}
            >
              Aumentar / Diminuir %
            </button>
            <button
              type="button"
              onClick={() => setMode("custom")}
              className={cn(
                "h-7 rounded text-xs font-medium transition-colors",
                mode === "custom" ? "bg-bg-surface text-ink shadow-sm" : "text-ink-dim hover:text-ink"
              )}
            >
              Valor exato
            </button>
          </div>

          {mode === "preset" ? (
            <>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => setDirection("up")}
                  className={cn(
                    "h-9 rounded-md border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors",
                    direction === "up"
                      ? "border-positive/40 bg-positive-subtle text-positive"
                      : "border-line bg-bg-surface text-ink-muted hover:text-ink"
                  )}
                >
                  <TrendingUp className="size-3.5" /> Aumentar
                </button>
                <button
                  type="button"
                  onClick={() => setDirection("down")}
                  className={cn(
                    "h-9 rounded-md border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors",
                    direction === "down"
                      ? "border-negative/40 bg-negative-subtle text-negative"
                      : "border-line bg-bg-surface text-ink-muted hover:text-ink"
                  )}
                >
                  <TrendingDown className="size-3.5" /> Diminuir
                </button>
              </div>

              <div className="grid grid-cols-4 gap-1.5">
                {PRESETS.map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setPresetPct(p)}
                    className={cn(
                      "h-9 rounded-md border text-xs font-medium transition-colors num",
                      presetPct === p
                        ? "border-accent bg-accent-subtle text-accent"
                        : "border-line bg-bg-surface text-ink-muted hover:text-ink"
                    )}
                  >
                    {p}%
                  </button>
                ))}
              </div>

              <div>
                <Label htmlFor="custom-pct" className="text-2xs">Outro %</Label>
                <Input
                  id="custom-pct"
                  type="number"
                  min={0}
                  step={1}
                  value={presetPct}
                  onChange={(e) => setPresetPct(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="mt-1 num"
                />
              </div>
            </>
          ) : (
            <div>
              <Label htmlFor="custom-budget" className="text-2xs">Novo orçamento diário (BRL)</Label>
              <div className="relative mt-1">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-dim font-medium">R$</span>
                <Input
                  id="custom-budget"
                  type="text"
                  inputMode="decimal"
                  value={custom}
                  onChange={(e) => setCustom(e.target.value)}
                  className="pl-9 num"
                  autoFocus
                />
              </div>
            </div>
          )}

          {/* Resumo da alteração */}
          <div className="rounded-md border border-line bg-bg-inset/40 p-3 space-y-1.5">
            <Row label="Atual" value={brl(currentDailyBudget)} />
            <Row
              label="Novo"
              value={brl(computedNew)}
              accent={delta > 0 ? "positive" : delta < 0 ? "negative" : undefined}
            />
            {Math.abs(delta) > 0.005 && (
              <Row
                label="Variação"
                value={`${delta >= 0 ? "+" : ""}${brl(delta)} (${deltaPct >= 0 ? "+" : ""}${deltaPct.toFixed(1)}%)`}
                accent={delta > 0 ? "positive" : "negative"}
                small
              />
            )}
          </div>
        </DialogBody>

        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancelar
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={saving || Math.abs(delta) < 0.005}
          >
            {saving ? "Salvando..." : "Aplicar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Row({
  label,
  value,
  accent,
  small,
}: {
  label: string;
  value: string;
  accent?: "positive" | "negative";
  small?: boolean;
}) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className={cn("text-ink-dim", small && "text-2xs")}>{label}</span>
      <span
        className={cn(
          "font-medium num",
          small && "text-2xs",
          accent === "positive" && "text-positive",
          accent === "negative" && "text-negative",
          !accent && "text-ink"
        )}
      >
        {value}
      </span>
    </div>
  );
}
