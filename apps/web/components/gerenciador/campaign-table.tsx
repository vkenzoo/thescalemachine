"use client";

import * as React from "react";
import {
  Pause,
  Play,
  Copy,
  Trash2,
  MoreHorizontal,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  Wrench,
  Eye,
  Pencil,
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
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { brl, brlCompact, num, pct } from "@/lib/format";
import { useResizableColumns, ColumnResizer, type ColumnConfig } from "@/lib/use-resizable-columns";
import type { MetaCampaignRow } from "@/lib/hooks/use-meta";
import { COLUMN_DEFS, DEFAULT_COLUMNS, resolveColumns } from "@/lib/gerenciador/column-defs";

// Colunas fixas (sempre visíveis) — checkbox, switch, nome, ações
const FIXED_COLUMNS_LEFT: ColumnConfig[] = [
  { id: "select", width: 36 },
  { id: "switch", width: 44 },
  { id: "name",   width: 240, minWidth: 140 },
];
const FIXED_COLUMNS_RIGHT: ColumnConfig[] = [
  { id: "actions", width: 50 },
];

interface Props {
  rows: MetaCampaignRow[];
  onBulkAction?: (count: number) => void;
  onBulkRun?: (action: "pause" | "activate" | "delete", ids: string[]) => void;
  onRowAction?: (id: string, action: "pause" | "activate" | "edit-budget" | "duplicate" | "delete") => void;
  /** Click no nome da campanha → drill-down pra tab Conjuntos */
  onDrillDown?: (id: string, name: string) => void;
  /** Conta atual — usado pra link "Abrir no Meta Ads" */
  accountId?: string | null;
  /** Selection controlada — page eleva pra mostrar badge na tab */
  selected?: Set<string>;
  onSelectionChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
  /** Colunas selecionadas pelo user via ColumnPicker (ids do COLUMN_DEFS) */
  columns?: string[];
}

type SortKey = "name" | "spend" | "roas" | "cpa" | "ctr" | "purchases" | "cpc" | "clicks" | "cpm" | "cpc" | "reach" | "impressions";

export function CampaignTable({
  rows,
  onBulkAction,
  onBulkRun,
  onRowAction,
  onDrillDown,
  accountId,
  selected: selectedProp,
  onSelectionChange,
  columns = DEFAULT_COLUMNS,
}: Props) {
  const [internalSelected, setInternalSelected] = React.useState<Set<string>>(new Set());
  const selected = selectedProp ?? internalSelected;
  const setSelected = onSelectionChange ?? setInternalSelected;
  const [sortKey, setSortKey] = React.useState<string>("spend");
  const [sortDir, setSortDir] = React.useState<"asc" | "desc">("desc");

  // Resolve definições + monta lista completa pro hook de resize.
  // Fallback pra DEFAULT_COLUMNS quando user nunca personalizou (array vazio do banco).
  const effectiveColumnIds = columns.length > 0 ? columns : DEFAULT_COLUMNS;
  const dynamicCols = React.useMemo(() => resolveColumns(effectiveColumnIds), [effectiveColumnIds]);
  const allCols = React.useMemo<ColumnConfig[]>(() => [
    ...FIXED_COLUMNS_LEFT,
    ...dynamicCols.map((c) => ({ id: c.id, width: c.width, minWidth: 70 })),
    ...FIXED_COLUMNS_RIGHT,
  ], [dynamicCols]);
  const { widths, setWidth, reset } = useResizableColumns("gerenciador-campaigns:cols-v2", allCols);

  const sorted = React.useMemo(() => {
    const arr = [...rows];
    arr.sort((a, b) => {
      const va = (a as any)[sortKey];
      const vb = (b as any)[sortKey];
      if (typeof va === "number" && typeof vb === "number") {
        return sortDir === "asc" ? va - vb : vb - va;
      }
      return sortDir === "asc"
        ? String(va).localeCompare(String(vb))
        : String(vb).localeCompare(String(va));
    });
    return arr;
  }, [rows, sortKey, sortDir]);

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

  const sortBy = (k: SortKey) => {
    if (sortKey === k) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(k);
      setSortDir("desc");
    }
  };

  return (
    <TooltipProvider delayDuration={250}>
      <div className="rounded-xl border border-line bg-bg-surface overflow-hidden">
        {/* Bulk action bar — aparece quando há seleção */}
        {selected.size > 0 && (
          <div className="flex items-center justify-between gap-3 px-4 py-2 bg-accent-subtle border-b border-accent/20 animate-fade-in">
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
          <table className="text-xs table-fixed" style={{ width: Object.values(widths).reduce((a, b) => a + b, 0) }}>
            <colgroup>
              {allCols.map((c) => (
                <col key={c.id} style={{ width: widths[c.id] ?? c.width }} />
              ))}
            </colgroup>
            <thead>
              <tr className="border-b border-line bg-bg-inset/40">
                {/* Checkbox + Switch combo column */}
                <Th sticky className="align-bottom pb-3">
                  <Checkbox
                    checked={allSelected ? true : someSelected ? "indeterminate" : false}
                    onCheckedChange={toggleAll}
                    aria-label="Selecionar todos"
                  />
                </Th>
                <Th sticky className="px-1 align-bottom" />
                <ResizableTh widths={widths} setWidth={setWidth} colId="name" sticky>
                  <div className="inline-flex items-center gap-1.5">
                    <SortHeader k="name" current={sortKey} dir={sortDir} onSort={sortBy}>
                      Nome da campanha
                    </SortHeader>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button className="text-ink-dim hover:text-ink transition-colors cursor-pointer" aria-label="Ocultar nomes">
                          <Eye className="size-3" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent>Privacidade — oculta nomes nesta coluna</TooltipContent>
                    </Tooltip>
                  </div>
                </ResizableTh>
                {dynamicCols.map((col) => (
                  <ResizableTh key={col.id} widths={widths} setWidth={setWidth} colId={col.id}>
                    {col.sortKey ? (
                      <SortHeader k={col.sortKey as any} current={sortKey} dir={sortDir} onSort={(k) => sortBy(k as any)}>
                        {col.header}
                      </SortHeader>
                    ) : (
                      <span>{col.header}</span>
                    )}
                  </ResizableTh>
                ))}
                <Th className="align-bottom" />
              </tr>
            </thead>
            <tbody>
              {sorted.map((row) => {
                const isSelected = selected.has(row.id);
                const isActive = row.status === "ACTIVE";
                return (
                  <tr
                    key={row.id}
                    className={cn(
                      "border-b border-line/60 hover:bg-bg-inset/40 transition-colors group",
                      isSelected && "bg-accent-subtle/40 hover:bg-accent-subtle/60",
                      !isActive && "opacity-60"
                    )}
                  >
                    <Td>
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() => toggle(row.id)}
                        aria-label={`Selecionar ${row.name}`}
                      />
                    </Td>
                    <Td className="px-1">
                      <Switch
                        checked={isActive}
                        onCheckedChange={(v) => onRowAction?.(row.id, v ? "activate" : "pause")}
                        aria-label="Ativar/Pausar"
                      />
                    </Td>
                    {/* Só o nome — ID e ABO/CBO ficam disponíveis como colunas opcionais via Personalizar Colunas */}
                    <Td className="py-3">
                      {onDrillDown ? (
                        <button
                          type="button"
                          onClick={() => onDrillDown(row.id, row.name)}
                          className="text-ink font-medium leading-snug break-words group-hover:text-accent hover:underline transition-colors max-w-[230px] block text-left cursor-pointer"
                          aria-label={`Ver conjuntos de ${row.name}`}
                        >
                          <Private>{row.name}</Private>
                        </button>
                      ) : (
                        <span className="text-ink font-medium leading-snug break-words group-hover:text-accent transition-colors max-w-[230px] block">
                          <Private>{row.name}</Private>
                        </span>
                      )}
                    </Td>
                    {dynamicCols.map((col) => {
                      // Caso especial: orçamento de campanha CBO é editável (override do format default)
                      if (col.id === "budget") {
                        return (
                          <CellL key={col.id}>
                            {row.budgetType === "ABO" ? (
                              <span className="text-ink-muted">ABO</span>
                            ) : (
                              <button
                                type="button"
                                onClick={() => onRowAction?.(row.id, "edit-budget")}
                                className="inline-flex items-center gap-1.5 text-positive hover:underline cursor-pointer font-medium tabular-nums"
                                aria-label="Editar orçamento da campanha"
                              >
                                {brl(row.dailyBudget)}
                                <Pencil className="size-3" />
                              </button>
                            )}
                          </CellL>
                        );
                      }
                      return <CellL key={col.id} mono>{col.format(row)}</CellL>;
                    })}
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
                          <DropdownMenuItem onSelect={() => onRowAction?.(row.id, isActive ? "pause" : "activate")}>
                            {isActive ? <><Pause /> Pausar</> : <><Play /> Ativar</>}
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onRowAction?.(row.id, "edit-budget")}>
                            <Pencil /> Editar orçamento
                          </DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => onRowAction?.(row.id, "duplicate")}>
                            <Copy /> Duplicar
                          </DropdownMenuItem>
                          {accountId && (
                            <DropdownMenuItem asChild>
                              <a
                                href={`https://www.facebook.com/adsmanager/manage/campaigns?act=${accountId.replace("act_", "")}&selected_campaign_ids=${row.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <ExternalLink /> Abrir no Meta Ads
                              </a>
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onSelect={() => onRowAction?.(row.id, "delete")} className="text-negative">
                            <Trash2 /> Excluir
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </Td>
                  </tr>
                );
              })}
            </tbody>
            <tfoot>
              <tr className="border-t border-line bg-bg-inset/40">
                <Td colSpan={3}>
                  <span className="text-2xs text-ink-dim uppercase tracking-wider font-semibold">
                    Total · {rows.length} campanhas
                  </span>
                </Td>
                {dynamicCols.map((col) => {
                  // Soma só onde faz sentido — métricas que são absolutas (não taxas/médias)
                  const SUMMABLE = new Set(["spend", "impressions", "reach", "clicks", "purchases", "revenue", "leads", "cart_adds", "checkouts", "messages", "ig_visits"]);
                  if (!SUMMABLE.has(col.id)) return <CellL key={col.id} />;
                  // Mapeia col.id → field na row
                  const FIELD_MAP: Record<string, string> = {
                    cart_adds: "cartAdds", ig_visits: "igVisits",
                  };
                  const field = FIELD_MAP[col.id] ?? col.id;
                  const sum = rows.reduce((s, r: any) => s + (Number(r[field]) || 0), 0);
                  // Use o format do col com uma row sintética
                  return <CellL key={col.id} mono>{col.format({ ...rows[0], [field]: sum } as any)}</CellL>;
                })}
                <Td />
              </tr>
            </tfoot>
          </table>
        </div>

        {rows.length === 0 && (
          <div className="px-4 py-12 text-center">
            <p className="text-sm text-ink-muted">Nenhuma campanha encontrada para esses filtros.</p>
            <p className="text-xs text-ink-dim mt-1">Tente limpar filtros ou expandir o período.</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

// =============================================================
// Cabeçalhos / células
// =============================================================

function Th({
  children,
  className,
  sticky,
  ...props
}: React.HTMLAttributes<HTMLTableCellElement> & { sticky?: boolean }) {
  return (
    <th
      className={cn(
        "px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-ink-dim",
        sticky && "sticky left-0 z-10 bg-bg-inset/95 backdrop-blur",
        className
      )}
      {...props}
    >
      {children}
    </th>
  );
}

/**
 * Cabeçalho redimensionável — wrapper que adiciona drag handle na borda direita.
 * Usa o hook useResizableColumns para persistir larguras em localStorage.
 */
function ResizableTh({
  children,
  colId,
  widths,
  setWidth,
  multiline,
  sticky,
  className,
}: {
  children?: React.ReactNode;
  colId: string;
  widths: Record<string, number>;
  setWidth: (id: string, w: number) => void;
  multiline?: boolean;
  sticky?: boolean;
  className?: string;
}) {
  const defaultWidth = COLUMN_DEFS[colId]?.width ?? 100;
  return (
    <th
      className={cn(
        "relative px-3 py-2.5 text-left text-2xs font-semibold uppercase tracking-wider text-ink-dim align-bottom",
        multiline ? "whitespace-normal leading-tight" : "whitespace-nowrap overflow-hidden text-ellipsis",
        sticky && "sticky left-0 z-10 bg-bg-inset/95 backdrop-blur",
        className
      )}
    >
      {children}
      <ColumnResizer
        initialWidth={widths[colId]}
        onResize={(w) => setWidth(colId, w)}
        onDoubleClick={() => setWidth(colId, defaultWidth)}
      />
    </th>
  );
}

function Td({
  children,
  className,
  colSpan,
  ...props
}: React.HTMLAttributes<HTMLTableCellElement> & { colSpan?: number }) {
  return (
    <td colSpan={colSpan} className={cn("px-3 py-2 align-top", className)} {...props}>
      {children}
    </td>
  );
}

/**
 * Célula numérica LEFT-aligned, peso/cor único.
 * Sans-serif com tabular-nums — Apple SF Pro tem números de largura fixa nativos.
 * Mono só atrapalha leitura em corpo pequeno (0/8, 1/l confundem).
 */
function CellL({
  children,
  className,
  mono, // mantido por compat — sem efeito
}: {
  children?: React.ReactNode;
  className?: string;
  mono?: boolean;
}) {
  return (
    <td
      className={cn(
        "px-3 py-3 text-left align-top",
        // Overflow controlado: se o usuário diminuir a coluna, conteúdo trunca com "..."
        "whitespace-nowrap overflow-hidden text-ellipsis",
        "text-[13px] text-ink tabular-nums",
        className
      )}
    >
      {children}
    </td>
  );
}

function SortHeader({
  k,
  current,
  dir,
  onSort,
  children,
}: {
  k: SortKey;
  current: SortKey;
  dir: "asc" | "desc";
  onSort: (k: SortKey) => void;
  children: React.ReactNode;
}) {
  const active = current === k;
  return (
    <button
      type="button"
      onClick={() => onSort(k)}
      className={cn(
        "inline-flex items-center gap-1 hover:text-ink transition-colors cursor-pointer text-left",
        active && "text-ink"
      )}
    >
      <span className="leading-tight">{children}</span>
      {active ? (
        dir === "asc" ? <ChevronUp className="size-3 shrink-0" /> : <ChevronDown className="size-3 shrink-0" />
      ) : (
        <ArrowUpDown className="size-2.5 opacity-30 shrink-0" />
      )}
    </button>
  );
}


