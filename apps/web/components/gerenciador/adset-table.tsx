"use client";

import * as React from "react";
import {
  Pause,
  Play,
  Copy,
  Trash2,
  MoreHorizontal,
  Pencil,
  Wrench,
  ExternalLink,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown";
import { Private } from "@/lib/privacy";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brl, num, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import type { MetaAdsetRow } from "@/lib/hooks/use-meta";
import { resolveColumns, DEFAULT_COLUMNS } from "@/lib/gerenciador/column-defs";

interface Props {
  rows: MetaAdsetRow[];
  onRowAction?: (id: string, action: "pause" | "activate" | "edit-budget" | "duplicate" | "delete") => void;
  /** Click no nome do conjunto → drill-down pra tab Anúncios */
  onDrillDown?: (id: string, name: string) => void;
  accountId?: string | null;
  /** Selection controlada */
  selected?: Set<string>;
  onSelectionChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
  onBulkAction?: (count: number) => void;
  onBulkRun?: (action: "pause" | "activate" | "delete", ids: string[]) => void;
  /** Colunas dinâmicas (selecionadas pelo user) */
  columns?: string[];
}

export function AdSetTable({
  rows,
  onRowAction,
  onDrillDown,
  accountId,
  selected: selectedProp,
  onSelectionChange,
  onBulkAction,
  onBulkRun,
  columns = [],
}: Props) {
  const effectiveCols = columns.length > 0 ? columns : DEFAULT_COLUMNS;
  const dynamicCols = React.useMemo(() => resolveColumns(effectiveCols), [effectiveCols]);
  const [internalSelected, setInternalSelected] = React.useState<Set<string>>(new Set());
  const selected = selectedProp ?? internalSelected;
  const setSelected = onSelectionChange ?? setInternalSelected;

  const allSelected = selected.size === rows.length && rows.length > 0;
  const someSelected = selected.size > 0 && !allSelected;

  const toggleAll = () => {
    if (allSelected) setSelected(new Set());
    else setSelected(new Set(rows.map((r) => r.id)));
  };

  const toggle = (id: string) => {
    setSelected((curr) => {
      const next = new Set(curr);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };
  return (
    <TooltipProvider delayDuration={250}>
      <div className="rounded-xl border border-line bg-bg-surface overflow-hidden">
        {/* Bulk action bar */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 bg-accent-subtle border-b border-accent/20">
            <span className="text-xs font-medium text-ink">
              <span className="text-accent num">{selected.size}</span> selecionado{selected.size > 1 ? "s" : ""}
            </span>
            <div className="flex items-center gap-1.5">
              <Button size="sm" variant="ghost" onClick={() => onBulkRun?.("pause", Array.from(selected))}>
                <Pause /> Pausar
              </Button>
              <Button size="sm" variant="ghost" onClick={() => onBulkRun?.("activate", Array.from(selected))}>
                <Play /> Ativar
              </Button>
              <Button size="sm" variant="ghost" disabled>
                <Copy /> Duplicar
              </Button>
              <Button
                size="sm"
                variant="ghost"
                className="text-negative hover:text-negative"
                onClick={() => onBulkRun?.("delete", Array.from(selected))}
              >
                <Trash2 /> Excluir
              </Button>
              <div className="w-px h-5 bg-line mx-1" />
              <Button size="sm" variant="primary" onClick={() => onBulkAction?.(selected.size)}>
                <Wrench /> Edições em massa
              </Button>
            </div>
          </div>
        )}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-line bg-bg-inset/40">
                <Th className="w-11">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                    aria-label="Selecionar todos"
                  />
                </Th>
                <Th className="w-9 px-1" />
                <Th>Conjunto</Th>
                <Th>Campanha</Th>
                {dynamicCols.map((col) => (
                  <Th key={col.id} className="text-right">{col.header}</Th>
                ))}
                <Th>Otimização</Th>
                <Th>Targeting</Th>
                <Th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isActive = r.status === "ACTIVE";
                const isSelected = selected.has(r.id);
                const hasOwnBudget = r.dailyBudget > 0 || r.lifetimeBudget > 0;
                return (
                  <tr
                    key={r.id}
                    className={cn(
                      "border-b border-line/60 hover:bg-bg-inset/40 transition-colors group",
                      isSelected && "bg-accent-subtle/40 hover:bg-accent-subtle/60",
                      !isActive && "opacity-60"
                    )}
                  >
                    <Td>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggle(r.id)}
                        aria-label={`Selecionar ${r.name}`}
                      />
                    </Td>
                    <Td className="px-1">
                      <Switch
                        checked={isActive}
                        onCheckedChange={(v) => onRowAction?.(r.id, v ? "activate" : "pause")}
                        aria-label="Ativar/Pausar"
                      />
                    </Td>
                    <Td>
                      <div className="flex flex-col gap-0.5">
                        {onDrillDown ? (
                          <button
                            type="button"
                            onClick={() => onDrillDown(r.id, r.name)}
                            className="text-ink font-medium leading-tight group-hover:text-accent hover:underline transition-colors text-left cursor-pointer"
                            aria-label={`Ver anúncios de ${r.name}`}
                          >
                            <Private>{r.name}</Private>
                          </button>
                        ) : (
                          <span className="text-ink font-medium leading-tight">
                            <Private>{r.name}</Private>
                          </span>
                        )}
                        <span className="font-mono text-2xs text-ink-dim">{r.id.slice(-10)}</span>
                      </div>
                    </Td>
                    <Td className="text-ink-muted truncate max-w-[200px]">
                      <Private>{r.campaignName}</Private>
                    </Td>
                    {dynamicCols.map((col) => {
                      // Override: orçamento de adset com budget próprio é editável
                      if (col.id === "budget") {
                        return (
                          <Td key={col.id} className="text-right num">
                            {hasOwnBudget ? (
                              <button
                                type="button"
                                onClick={() => onRowAction?.(r.id, "edit-budget")}
                                className="inline-flex items-center gap-1.5 text-positive hover:underline cursor-pointer font-medium"
                                aria-label="Editar orçamento do conjunto"
                              >
                                {r.dailyBudget > 0 ? `${brl(r.dailyBudget)}/d` : brl(r.lifetimeBudget)}
                                <Pencil className="size-3" />
                              </button>
                            ) : (
                              <span className="text-ink-dim">CBO</span>
                            )}
                          </Td>
                        );
                      }
                      return <Td key={col.id} className="text-right num">{col.format(r)}</Td>;
                    })}
                    <Td>
                      <Badge tone="neutral" size="xs">
                        {r.optimizationGoal?.replace(/_/g, " ").toLowerCase() ?? "—"}
                      </Badge>
                    </Td>
                    <Td className="text-2xs text-ink-muted truncate max-w-[180px]">
                      {r.targetingSummary}
                    </Td>
                    <Td className="text-right pr-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            type="button"
                            className="size-7 inline-flex items-center justify-center rounded text-ink-dim hover:text-ink hover:bg-bg-elevated transition-colors cursor-pointer"
                            aria-label="Mais ações"
                          >
                            <MoreHorizontal className="size-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => onRowAction?.(r.id, isActive ? "pause" : "activate")}>
                            {isActive ? <><Pause /> Pausar</> : <><Play /> Ativar</>}
                          </DropdownMenuItem>
                          {hasOwnBudget && (
                            <DropdownMenuItem onSelect={() => onRowAction?.(r.id, "edit-budget")}>
                              <Pencil /> Editar orçamento
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuItem onSelect={() => onRowAction?.(r.id, "duplicate")}>
                            <Copy /> Duplicar
                          </DropdownMenuItem>
                          {accountId && (
                            <DropdownMenuItem asChild>
                              <a
                                href={`https://www.facebook.com/adsmanager/manage/adsets?act=${accountId.replace("act_", "")}&selected_adset_ids=${r.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink /> Abrir no Meta Ads
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => onRowAction?.(r.id, "delete")} className="text-negative">
                            <Trash2 /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {rows.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-ink-muted">Nenhum conjunto encontrado.</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-ink-dim whitespace-nowrap",
        className
      )}
    >
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <td className={cn("px-3 py-2.5 align-middle", className)}>{children}</td>
  );
}
