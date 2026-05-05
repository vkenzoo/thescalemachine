"use client";

import * as React from "react";
import { Search, FileText, ExternalLink, Settings2, RefreshCw, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";

interface Props {
  query: string;
  onQuery: (v: string) => void;
  onlyActive: boolean;
  onOnlyActive: (v: boolean) => void;
  hadSpend: boolean;
  onHadSpend: (v: boolean) => void;
  onColumnsClick?: () => void;
  onNotesClick?: () => void;
  onCopyReportClick?: () => void;
  onRefresh?: () => void;
}

export function FilterBar({
  query,
  onQuery,
  onlyActive,
  onOnlyActive,
  hadSpend,
  onHadSpend,
  onColumnsClick,
  onNotesClick,
  onCopyReportClick,
  onRefresh,
}: Props) {
  return (
    <TooltipProvider delayDuration={250}>
      <div className="flex items-center gap-2 flex-wrap">
        {/* Search com sintaxe especial */}
        <div className="relative flex-1 min-w-[260px] max-w-md">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ink-dim pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => onQuery(e.target.value)}
            placeholder="Filtrar por nome…"
            className="pl-8 pr-16 h-8 text-xs"
          />
          <SyntaxHelp />
        </div>

        <ToggleChip checked={onlyActive} onChange={onOnlyActive}>
          Apenas ativos
        </ToggleChip>
        <ToggleChip checked={hadSpend} onChange={onHadSpend}>
          Tiveram veiculação
        </ToggleChip>

        <div className="ml-auto flex items-center gap-1.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="secondary" aria-label="Atualizar dados" onClick={onRefresh}>
                <RefreshCw />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Atualizar (último: agora)</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="secondary" aria-label="Notas da conta" onClick={onNotesClick}>
                <FileText />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Notas desta conta</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="secondary" aria-label="Copiar relatório" onClick={onCopyReportClick}>
                <Copy />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Copiar relatório resumido</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon-sm" variant="secondary" aria-label="Personalizar colunas" onClick={onColumnsClick}>
                <Settings2 />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Personalizar colunas</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="sm" variant="secondary">
                <ExternalLink />
                Abrir no Meta
              </Button>
            </TooltipTrigger>
            <TooltipContent side="bottom">Abrir esta conta no Meta Ads Manager</TooltipContent>
          </Tooltip>
        </div>
      </div>
    </TooltipProvider>
  );
}

function ToggleChip({
  checked,
  onChange,
  children,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "h-8 px-2.5 inline-flex items-center gap-2 rounded-md border text-xs font-medium cursor-pointer transition-colors",
        checked
          ? "border-accent/40 bg-accent-subtle/40 text-accent"
          : "border-line bg-bg-surface text-ink-muted hover:text-ink hover:border-line-strong"
      )}
    >
      <Switch checked={checked} onCheckedChange={onChange} />
      {children}
    </label>
  );
}

function SyntaxHelp() {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          className="absolute right-2 top-1/2 -translate-y-1/2 size-5 inline-flex items-center justify-center rounded text-ink-dim hover:text-ink hover:bg-bg-elevated transition-colors cursor-pointer"
          aria-label="Ajuda de sintaxe"
        >
          <kbd className="font-mono text-2xs">?</kbd>
        </button>
      </TooltipTrigger>
      <TooltipContent side="bottom" className="max-w-[280px]">
        <div className="space-y-1.5">
          <p className="font-medium">Sintaxe de filtro</p>
          <p>
            <code className="font-mono text-2xs bg-bg-inset px-1 py-0.5 rounded">+</code> = OU
            (qualquer termo) · ex: <span className="font-mono text-2xs">black + branco</span>
          </p>
          <p>
            <code className="font-mono text-2xs bg-bg-inset px-1 py-0.5 rounded">;</code> = E
            (todos os termos) · ex: <span className="font-mono text-2xs">black ; video</span>
          </p>
        </div>
      </TooltipContent>
    </Tooltip>
  );
}
