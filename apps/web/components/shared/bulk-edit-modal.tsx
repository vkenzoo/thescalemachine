"use client";

import * as React from "react";
import {
  DollarSign,
  Pencil,
  Sparkles,
  TrendingUp,
  TrendingDown,
} from "lucide-react";
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

export type BulkEditMode = "budget" | "name" | null;

export interface BulkEditPayload {
  mode: BulkEditMode;
  // Budget
  budgetDirection?: "up" | "down" | "set";
  budgetPercent?: number;
  budgetAbsolute?: number;
  // Name (find/replace)
  findText?: string;
  replaceText?: string;
  caseSensitive?: boolean;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  selectedCount: number;
  /** "campanha", "conjunto", "anúncio" */
  entityLabel: string;
  /** Callback que aplica a operação. Recebe payload pronto. */
  onApply: (payload: BulkEditPayload) => Promise<void>;
}

export function BulkEditModal({ open, onOpenChange, selectedCount, entityLabel, onApply }: Props) {
  const [mode, setMode] = React.useState<BulkEditMode>(null);
  const [busy, setBusy] = React.useState(false);

  // Budget state
  const [budgetDirection, setBudgetDirection] = React.useState<"up" | "down" | "set">("up");
  const [budgetPercent, setBudgetPercent] = React.useState(15);
  const [budgetAbsolute, setBudgetAbsolute] = React.useState("");

  // Name state
  const [findText, setFindText] = React.useState("");
  const [replaceText, setReplaceText] = React.useState("");
  const [caseSensitive, setCaseSensitive] = React.useState(false);

  React.useEffect(() => {
    if (open) {
      setMode(null);
      setBusy(false);
      setBudgetDirection("up");
      setBudgetPercent(15);
      setBudgetAbsolute("");
      setFindText("");
      setReplaceText("");
      setCaseSensitive(false);
    }
  }, [open]);

  const canSubmit = (() => {
    if (mode === "budget") {
      if (budgetDirection === "set") {
        const v = parseFloat(budgetAbsolute.replace(",", "."));
        return !isNaN(v) && v > 0;
      }
      return budgetPercent > 0;
    }
    if (mode === "name") return findText.length > 0;
    return false;
  })();

  const handleApply = async () => {
    if (!canSubmit || !mode) return;
    setBusy(true);
    try {
      const payload: BulkEditPayload = { mode };
      if (mode === "budget") {
        payload.budgetDirection = budgetDirection;
        if (budgetDirection === "set") {
          payload.budgetAbsolute = parseFloat(budgetAbsolute.replace(",", "."));
        } else {
          payload.budgetPercent = budgetPercent;
        }
      } else if (mode === "name") {
        payload.findText = findText;
        payload.replaceText = replaceText;
        payload.caseSensitive = caseSensitive;
      }
      await onApply(payload);
      onOpenChange(false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Edições em massa</DialogTitle>
          <DialogDescription>
            Aplicar alteração em <strong className="text-ink">{selectedCount}</strong>{" "}
            {entityLabel}{selectedCount === 1 ? "" : "s"} selecionado{selectedCount === 1 ? "" : "s"}.
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          {/* Escolha de ação */}
          {mode === null && (
            <div className="grid grid-cols-1 gap-2">
              <ModeCard
                icon={DollarSign}
                title="Alterar orçamento"
                desc="Aumenta, diminui ou define orçamento fixo em todas as campanhas/conjuntos selecionados."
                onClick={() => setMode("budget")}
              />
              <ModeCard
                icon={Pencil}
                title="Editar nome (Localizar e Substituir)"
                desc="Substitui um trecho do nome em todos os itens. Útil pra renomear lote de criativos."
                onClick={() => setMode("name")}
              />
            </div>
          )}

          {/* Modo Budget */}
          {mode === "budget" && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-1.5">
                <DirBtn active={budgetDirection === "up"} onClick={() => setBudgetDirection("up")} icon={TrendingUp} tone="positive">
                  Aumentar
                </DirBtn>
                <DirBtn active={budgetDirection === "down"} onClick={() => setBudgetDirection("down")} icon={TrendingDown} tone="negative">
                  Diminuir
                </DirBtn>
                <DirBtn active={budgetDirection === "set"} onClick={() => setBudgetDirection("set")} icon={DollarSign} tone="accent">
                  Definir fixo
                </DirBtn>
              </div>

              {budgetDirection !== "set" ? (
                <div className="space-y-2">
                  <div className="grid grid-cols-4 gap-1.5">
                    {[10, 15, 25, 35].map((p) => (
                      <button
                        key={p}
                        type="button"
                        onClick={() => setBudgetPercent(p)}
                        className={cn(
                          "h-9 rounded-md border text-xs font-medium transition-colors num",
                          budgetPercent === p
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
                      value={budgetPercent}
                      onChange={(e) => setBudgetPercent(Math.max(0, parseFloat(e.target.value) || 0))}
                      className="mt-1 num"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <Label htmlFor="abs-budget" className="text-2xs">Novo orçamento diário</Label>
                  <div className="relative mt-1">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-ink-dim font-medium">R$</span>
                    <Input
                      id="abs-budget"
                      type="text"
                      inputMode="decimal"
                      value={budgetAbsolute}
                      onChange={(e) => setBudgetAbsolute(e.target.value)}
                      placeholder="50,00"
                      className="pl-9 num"
                      autoFocus
                    />
                  </div>
                  <p className="text-2xs text-ink-dim mt-1.5">
                    Valor aplicado igual em todos os {selectedCount} itens.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Modo Nome */}
          {mode === "name" && (
            <div className="space-y-3">
              <div>
                <Label htmlFor="find" className="text-2xs">Localizar</Label>
                <Input
                  id="find"
                  value={findText}
                  onChange={(e) => setFindText(e.target.value)}
                  placeholder="Texto a procurar (ex: Black Friday)"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="replace" className="text-2xs">Substituir por</Label>
                <Input
                  id="replace"
                  value={replaceText}
                  onChange={(e) => setReplaceText(e.target.value)}
                  placeholder="Novo texto (deixe vazio pra remover)"
                />
              </div>
              <label className="flex items-center gap-2 text-xs text-ink-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={caseSensitive}
                  onChange={(e) => setCaseSensitive(e.target.checked)}
                  className="size-3.5"
                />
                Diferenciar maiúsculas/minúsculas
              </label>
              <div className="rounded-md border border-accent/30 bg-accent-subtle/20 p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-2xs font-semibold uppercase tracking-wider text-accent">
                  <Sparkles className="size-3" /> Como vai ficar
                </div>
                <p className="text-xs text-ink leading-relaxed">
                  {findText
                    ? <>Cada ocorrência de <code className="bg-bg-inset px-1 py-0.5 rounded text-2xs">{findText}</code> vira <code className="bg-bg-inset px-1 py-0.5 rounded text-2xs">{replaceText || "(removido)"}</code> em {selectedCount} {entityLabel}{selectedCount === 1 ? "" : "s"}.</>
                    : <span className="text-ink-dim">Digite o que procurar acima.</span>}
                </p>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          {mode !== null && (
            <Button variant="ghost" onClick={() => setMode(null)} disabled={busy}>
              Voltar
            </Button>
          )}
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancelar
          </Button>
          {mode !== null && (
            <Button variant="primary" onClick={handleApply} disabled={!canSubmit || busy} loading={busy}>
              Aplicar a {selectedCount}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ModeCard({
  icon: Icon,
  title,
  desc,
  onClick,
}: {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  desc: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group rounded-lg border border-line bg-bg-surface p-4 text-left hover:border-accent/40 hover:bg-accent-subtle/10 transition-all cursor-pointer"
    >
      <div className="flex items-start gap-3">
        <div className="size-9 rounded-md bg-bg-inset border border-line grid place-items-center group-hover:bg-accent-subtle/30 transition-colors shrink-0">
          <Icon className="size-4 text-accent" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-ink leading-tight">{title}</p>
          <p className="text-2xs text-ink-muted mt-1.5 leading-relaxed pretty">{desc}</p>
        </div>
        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-2xs text-accent font-medium shrink-0 mt-1">→</span>
      </div>
    </button>
  );
}

function DirBtn({
  active,
  onClick,
  icon: Icon,
  tone,
  children,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ComponentType<{ className?: string }>;
  tone: "positive" | "negative" | "accent";
  children: React.ReactNode;
}) {
  const toneCls = {
    positive: "border-positive/40 bg-positive-subtle text-positive",
    negative: "border-negative/40 bg-negative-subtle text-negative",
    accent: "border-accent/40 bg-accent-subtle text-accent",
  }[tone];

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-10 rounded-md border text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors",
        active ? toneCls : "border-line bg-bg-surface text-ink-muted hover:text-ink"
      )}
    >
      <Icon className="size-3.5" /> {children}
    </button>
  );
}
