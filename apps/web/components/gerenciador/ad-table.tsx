"use client";

import * as React from "react";
import {
  MoreHorizontal,
  Image as ImageIcon,
  Layers,
  Video,
  Pause,
  Play,
  Copy,
  Trash2,
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
import type { MetaAdRow } from "@/lib/hooks/use-meta";

interface Props {
  rows: MetaAdRow[];
  onRowAction?: (id: string, action: "pause" | "activate" | "duplicate" | "delete") => void;
  accountId?: string | null;
  /** Selection controlada */
  selected?: Set<string>;
  onSelectionChange?: React.Dispatch<React.SetStateAction<Set<string>>>;
  onBulkAction?: (count: number) => void;
  onBulkRun?: (action: "pause" | "activate" | "delete", ids: string[]) => void;
}

export function AdTable({
  rows,
  onRowAction,
  accountId,
  selected: selectedProp,
  onSelectionChange,
  onBulkAction,
  onBulkRun,
}: Props) {
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
                <Th>Anúncio</Th>
                <Th>Conjunto · Campanha</Th>
                <Th>Tipo</Th>
                <Th className="text-right">Investido</Th>
                <Th className="text-right">Impressões</Th>
                <Th className="text-right">CTR</Th>
                <Th className="text-right">CPC</Th>
                <Th className="text-right">CPM</Th>
                <Th className="text-right">Compras</Th>
                <Th className="text-right">CPA</Th>
                <Th className="text-right">Frequência</Th>
                <Th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => {
                const isActive = r.status === "ACTIVE";
                const isSelected = selected.has(r.id);
                const hasFrequencyAlert = r.frequency > 4;
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
                      <div className="flex items-center gap-2.5">
                        <CreativeThumb thumbnailUrl={r.thumbnailUrl} type={r.creativeType} />
                        <div className="flex flex-col gap-0.5 min-w-0">
                          <span className="text-ink font-medium truncate max-w-[220px] leading-tight">
                            <Private>{r.name}</Private>
                          </span>
                          <span className="font-mono text-2xs text-ink-dim">{r.id.slice(-10)}</span>
                        </div>
                      </div>
                    </Td>
                    <Td className="text-ink-muted text-2xs truncate max-w-[200px]">
                      <Private>{r.adsetName}</Private> · <Private>{r.campaignName}</Private>
                    </Td>
                    <Td>
                      <Badge tone={r.creativeType === "video" ? "warning" : "info"} size="xs">
                        {r.creativeType === "video" ? "Vídeo" : r.creativeType === "image" ? "Imagem" : "—"}
                      </Badge>
                    </Td>
                    <Td className="text-right num text-ink font-medium">{brl(r.spend)}</Td>
                    <Td className="text-right num">{num(r.impressions)}</Td>
                    <Td className="text-right num">{pct(r.ctr)}</Td>
                    <Td className="text-right num">{r.cpc > 0 ? brl(r.cpc) : <span className="text-ink-dim">—</span>}</Td>
                    <Td className="text-right num">{r.cpm > 0 ? brl(r.cpm) : <span className="text-ink-dim">—</span>}</Td>
                    <Td className="text-right num">{num(r.purchases)}</Td>
                    <Td className="text-right num">
                      {r.cpa > 0 ? brl(r.cpa) : <span className="text-ink-dim">—</span>}
                    </Td>
                    <Td className="text-right num">
                      <span className={hasFrequencyAlert ? "text-negative font-medium" : "text-ink"}>
                        {r.frequency.toFixed(2)}
                      </span>
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
                          <DropdownMenuItem onSelect={() => onRowAction?.(r.id, "duplicate")}>
                            <Copy /> Duplicar
                          </DropdownMenuItem>
                          {accountId && (
                            <DropdownMenuItem asChild>
                              <a
                                href={`https://www.facebook.com/adsmanager/manage/ads?act=${accountId.replace("act_", "")}&selected_ad_ids=${r.id}`}
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
            <p className="text-sm text-ink-muted">Nenhum anúncio encontrado.</p>
          </div>
        )}
      </div>
    </TooltipProvider>
  );
}

function CreativeThumb({
  thumbnailUrl,
  type,
}: {
  thumbnailUrl: string | null;
  type: "video" | "image" | "unknown";
}) {
  if (thumbnailUrl) {
    return (
      <div className="relative size-9 rounded overflow-hidden bg-bg-inset shrink-0">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={thumbnailUrl}
          alt=""
          className="size-full object-cover"
          referrerPolicy="no-referrer"
        />
        {type === "video" && (
          <span className="absolute inset-0 grid place-items-center bg-black/30">
            <Video className="size-3 text-white" />
          </span>
        )}
      </div>
    );
  }
  return (
    <div
      className={cn(
        "size-9 rounded grid place-items-center shrink-0",
        type === "video" ? "bg-warning-subtle text-warning" : "bg-info-subtle text-info"
      )}
    >
      {type === "video" ? <Layers className="size-4" /> : <ImageIcon className="size-4" />}
    </div>
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
