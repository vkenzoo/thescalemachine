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
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/cn";

export interface BulkProgressState {
  total: number;
  done: number;
  success: number;
  failed: number;
  errors: { id: string; message: string }[];
  status: "running" | "complete";
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  title: string;
  state: BulkProgressState;
}

export function BulkProgressModal({ open, onOpenChange, title, state }: Props) {
  const pct = state.total > 0 ? (state.done / state.total) * 100 : 0;
  const allOk = state.status === "complete" && state.failed === 0;
  const allFailed = state.status === "complete" && state.success === 0;

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        // Não fecha enquanto rodando
        if (state.status === "running") return;
        onOpenChange(v);
      }}
    >
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {state.status === "running"
              ? `Processando ${state.done} de ${state.total}…`
              : `Concluído: ${state.success} sucesso${state.success === 1 ? "" : "s"}${state.failed > 0 ? `, ${state.failed} falha${state.failed === 1 ? "" : "s"}` : ""}.`}
          </DialogDescription>
        </DialogHeader>

        <DialogBody className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-2xs">
              <span className="text-ink-muted font-mono num">
                {state.done} / {state.total}
              </span>
              <span className="text-ink-muted font-mono num">{pct.toFixed(0)}%</span>
            </div>
            <Progress value={pct} />
          </div>

          {state.status === "running" && (
            <div className="rounded-md border border-line bg-bg-inset px-3 py-2.5 flex items-center gap-2 text-xs text-ink-muted">
              <Loader2 className="size-4 animate-spin" />
              Aguarde, não feche esta janela.
            </div>
          )}

          {state.status === "complete" && (
            <div className={cn(
              "rounded-md border p-3 text-xs",
              allOk ? "border-positive/30 bg-positive-subtle/40" :
              allFailed ? "border-negative/30 bg-negative-subtle/40" :
              "border-warning/30 bg-warning-subtle/40"
            )}>
              <div className="flex items-start gap-2">
                {allOk ? (
                  <CheckCircle2 className="size-4 text-positive shrink-0 mt-0.5" />
                ) : allFailed ? (
                  <XCircle className="size-4 text-negative shrink-0 mt-0.5" />
                ) : (
                  <CheckCircle2 className="size-4 text-warning shrink-0 mt-0.5" />
                )}
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "font-medium",
                    allOk ? "text-positive" : allFailed ? "text-negative" : "text-warning"
                  )}>
                    {allOk ? "Tudo certo!" : allFailed ? "Nenhuma ação aplicada" : "Concluído com algumas falhas"}
                  </p>
                  {state.errors.length > 0 && (
                    <details className="mt-2">
                      <summary className="cursor-pointer text-2xs text-ink-muted hover:text-ink">
                        Ver {state.errors.length} {state.errors.length === 1 ? "erro" : "erros"}
                      </summary>
                      <ul className="mt-1.5 space-y-0.5 max-h-32 overflow-y-auto">
                        {state.errors.slice(0, 10).map((e, i) => (
                          <li key={i} className="text-2xs text-ink-muted font-mono">
                            <span className="text-ink-dim">{e.id.slice(-8)}:</span> {e.message}
                          </li>
                        ))}
                      </ul>
                    </details>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogBody>

        <DialogFooter>
          <Button
            variant={state.status === "complete" ? "primary" : "ghost"}
            onClick={() => onOpenChange(false)}
            disabled={state.status === "running"}
          >
            {state.status === "running" ? "Aguarde…" : "Fechar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
