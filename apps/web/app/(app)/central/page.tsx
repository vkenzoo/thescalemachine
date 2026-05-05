"use client";

import * as React from "react";
import Link from "next/link";
import {
  RefreshCw,
  Settings2,
  Search,
  ExternalLink,
  Filter,
  Eye,
  Plug,
  AlertTriangle,
} from "lucide-react";
import { ModuleHeader } from "@/components/layout/module-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tooltip, TooltipContent, TooltipProvider } from "@/components/ui/tooltip";
import { ColumnPicker } from "@/components/shared/column-picker";
import { PeriodPicker } from "@/components/gerenciador/period-picker";
import { EmptyState } from "@/components/layout/empty-state";
import { brl, brlCompact, num, pct } from "@/lib/format";
import { Private } from "@/lib/privacy";
import { cn } from "@/lib/cn";
import { usePrivacy } from "@/lib/privacy";
import { useResizableColumns, ColumnResizer, type ColumnConfig } from "@/lib/use-resizable-columns";
import {
  useMetaAccountInsights,
  refreshAllMetaData,
  type Period,
  type MetaAccountInsight,
} from "@/lib/hooks/use-meta";
import { useToast } from "@/components/ui/toast";

const CENTRAL_COLUMNS: ColumnConfig[] = [
  { id: "account",     width: 280, minWidth: 180 },
  { id: "spend",       width: 130, minWidth: 90 },
  { id: "impressions", width: 120, minWidth: 90 },
  { id: "clicks",      width: 100, minWidth: 70 },
  { id: "cpm",         width: 90,  minWidth: 70 },
  { id: "cpc",         width: 90,  minWidth: 70 },
  { id: "ctr",         width: 80,  minWidth: 60 },
  { id: "purchases",   width: 100, minWidth: 70 },
  { id: "cpa",         width: 130, minWidth: 90 },
  { id: "roas",        width: 90,  minWidth: 70 },
  { id: "leads",       width: 100, minWidth: 70 },
  { id: "frequency",   width: 110, minWidth: 80 },
  { id: "ig_visits",   width: 130, minWidth: 100 },
  { id: "reach",       width: 110, minWidth: 80 },
];

export default function CentralPage() {
  const { push } = useToast();
  const [period, setPeriod] = React.useState<Period>("last_30d");
  const [hadVeicul, setHadVeicul] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [columnsOpen, setColumnsOpen] = React.useState(false);
  const { enabled: privacyEnabled, toggle: togglePrivacy } = usePrivacy();
  const { widths, setWidth } = useResizableColumns("central:cols", CENTRAL_COLUMNS);

  const { accounts, isLoading, error, refresh } = useMetaAccountInsights(period);

  const filtered = React.useMemo(() => {
    return accounts.filter((a) => {
      if (hadVeicul && a.spend <= 0) return false;
      if (query && !a.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [accounts, query, hadVeicul]);

  const kpis = React.useMemo(() => {
    return filtered.reduce(
      (acc, a) => {
        acc.spend += a.spend;
        acc.impressions += a.impressions;
        acc.clicks += a.clicks;
        acc.purchases += a.purchases;
        acc.revenue += a.revenue;
        acc.reach += a.reach;
        return acc;
      },
      { spend: 0, impressions: 0, clicks: 0, purchases: 0, revenue: 0, reach: 0 }
    );
  }, [filtered]);

  const cpm = kpis.impressions > 0 ? (kpis.spend / kpis.impressions) * 1000 : 0;

  const handleRefresh = () => {
    refreshAllMetaData();
    push({ tone: "info", title: "Atualizando…", description: "Sincronizando insights." });
  };

  // ============================================================
  // EMPTY STATES
  // ============================================================
  if (isLoading && accounts.length === 0) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
        <div className="h-12 w-72 bg-bg-elevated rounded-md animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="h-24 bg-bg-elevated/60 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-[500px] bg-bg-elevated/40 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <EmptyState
          icon={AlertTriangle}
          title="Erro ao carregar contas"
          description={error.message ?? "Tente recarregar a página."}
          action={
            <Button variant="primary" onClick={() => location.reload()}>
              Recarregar
            </Button>
          }
          size="lg"
        />
      </div>
    );
  }

  if (accounts.length === 0) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <EmptyState
          icon={Plug}
          title="Conecte sua primeira conta Meta"
          description="A Central reúne todas as contas conectadas em uma visão consolidada."
          action={
            <Link href="/connect">
              <Button variant="primary">Conectar conta Meta</Button>
            </Link>
          }
          size="lg"
        />
      </div>
    );
  }

  return (
    <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
      <ModuleHeader
        eyebrow="Tráfego"
        title="Central de Contas"
        description="Visão consolidada de todas as suas contas de anúncios"
        tutorial
        actions={
          <>
            <PeriodPicker value={period} onChange={setPeriod} />
            <Button
              variant={hadVeicul ? "primary" : "secondary"}
              size="sm"
              onClick={() => setHadVeicul((v) => !v)}
            >
              <Filter className="size-3.5" />
              Com veiculação
            </Button>
            <Button
              variant={privacyEnabled ? "primary" : "secondary"}
              size="icon-sm"
              onClick={togglePrivacy}
              aria-label="Modo privado"
            >
              <Eye />
            </Button>
            <Button variant="secondary" size="icon-sm" onClick={() => setColumnsOpen(true)} aria-label="Personalizar colunas">
              <Settings2 />
            </Button>
            <Button variant="primary" size="sm" onClick={handleRefresh}>
              <RefreshCw /> Atualizar
            </Button>
          </>
        }
      />

      <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <Kpi label="Gasto"               value={brlCompact(kpis.spend)}                count={filtered.length} />
        <Kpi label="Impressões"          value={num(kpis.impressions)}                  count={filtered.length} />
        <Kpi label="Cliques"             value={num(kpis.clicks)}                       count={filtered.length} />
        <Kpi label="Valor de Conversão"  value={brlCompact(kpis.revenue)}               count={filtered.length} />
        <Kpi label="Compras"             value={num(kpis.purchases)}                    count={filtered.length} />
        <Kpi label="CPM"                 value={kpis.impressions ? brl(cpm) : "—"}      count={filtered.length} />
      </section>

      <div className="flex items-center gap-3 flex-wrap">
        <div className="relative w-64">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ink-dim pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Pesquisar conta…"
            className="pl-8 h-9 text-xs"
          />
        </div>
      </div>

      <TooltipProvider delayDuration={250}>
        <div className="rounded-xl border border-line bg-bg-surface overflow-hidden">
          <div className="px-4 py-3 border-b border-line bg-bg-inset/40 flex items-center justify-between">
            <span className="text-xs font-semibold text-ink">Todas as contas</span>
            <span className="text-2xs text-ink-dim">
              {filtered.length} {filtered.length === 1 ? "conta" : "contas"}
            </span>
          </div>
          {filtered.length === 0 ? (
            <div className="px-4 py-16 text-center">
              <p className="text-sm text-ink-muted">
                {hadVeicul
                  ? "Nenhuma conta com gasto no período."
                  : "Nenhuma conta encontrada."}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="text-xs table-fixed" style={{ width: Object.values(widths).reduce((a, b) => a + b, 0) }}>
                <colgroup>
                  {CENTRAL_COLUMNS.map((c) => (
                    <col key={c.id} style={{ width: widths[c.id] ?? c.width }} />
                  ))}
                </colgroup>
                <thead>
                  <tr className="border-b border-line bg-bg-inset/40">
                    <ResizableCol widths={widths} setWidth={setWidth} colId="account" sticky align="left">Conta</ResizableCol>
                    <ResizableCol widths={widths} setWidth={setWidth} colId="spend" sorted>Gasto ↓</ResizableCol>
                    <ResizableCol widths={widths} setWidth={setWidth} colId="impressions">Impressões</ResizableCol>
                    <ResizableCol widths={widths} setWidth={setWidth} colId="clicks">Cliques</ResizableCol>
                    <ResizableCol widths={widths} setWidth={setWidth} colId="cpm">CPM</ResizableCol>
                    <ResizableCol widths={widths} setWidth={setWidth} colId="cpc">CPC</ResizableCol>
                    <ResizableCol widths={widths} setWidth={setWidth} colId="ctr">CTR</ResizableCol>
                    <ResizableCol widths={widths} setWidth={setWidth} colId="purchases">Compras</ResizableCol>
                    <ResizableCol widths={widths} setWidth={setWidth} colId="cpa">CPA</ResizableCol>
                    <ResizableCol widths={widths} setWidth={setWidth} colId="roas">ROAS</ResizableCol>
                    <ResizableCol widths={widths} setWidth={setWidth} colId="leads">Leads</ResizableCol>
                    <ResizableCol widths={widths} setWidth={setWidth} colId="frequency">Frequência</ResizableCol>
                    <ResizableCol widths={widths} setWidth={setWidth} colId="ig_visits">Visitas IG</ResizableCol>
                    <ResizableCol widths={widths} setWidth={setWidth} colId="reach">Alcance</ResizableCol>
                  </tr>
                </thead>
                <tbody>
                  {filtered
                    .slice()
                    .sort((a, b) => b.spend - a.spend)
                    .map((a) => (
                      <Row key={a.id} account={a} />
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </TooltipProvider>

      <ColumnPicker open={columnsOpen} onOpenChange={setColumnsOpen} />
    </div>
  );
}

function Kpi({
  label,
  value,
  count,
}: {
  label: string;
  value: string;
  count: number;
}) {
  return (
    <div className="rounded-xl border border-line bg-bg-surface p-4 hover:border-line-strong transition-colors cursor-pointer">
      <div className="text-xs uppercase tracking-wider font-semibold text-ink-dim leading-none">
        {label}
      </div>
      <div className="num text-xl text-ink font-semibold mt-3 leading-tight tracking-tight">{value}</div>
      <div className="text-2xs text-ink-dim mt-2">{count} contas</div>
    </div>
  );
}

function ResizableCol({
  children,
  colId,
  widths,
  setWidth,
  sticky,
  sorted,
  align = "right",
}: {
  children?: React.ReactNode;
  colId: string;
  widths: Record<string, number>;
  setWidth: (id: string, w: number) => void;
  sticky?: boolean;
  sorted?: boolean;
  align?: "left" | "right";
}) {
  const defaultWidth = CENTRAL_COLUMNS.find((c) => c.id === colId)?.width ?? 100;
  return (
    <th
      className={cn(
        "relative px-3 py-2.5 text-2xs font-semibold uppercase tracking-wider whitespace-nowrap overflow-hidden text-ellipsis",
        align === "left" ? "text-left" : "text-right",
        sorted ? "text-accent" : "text-ink-dim",
        sticky && "sticky left-0 z-10 bg-bg-inset/95 backdrop-blur"
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

function CellNum({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <td className={cn("px-3 py-2.5 text-right num text-ink whitespace-nowrap overflow-hidden text-ellipsis", className)}>
      {children}
    </td>
  );
}

function Row({ account: a }: { account: MetaAccountInsight }) {
  const isInactive = a.accountStatus === "disabled" || a.fetchStatus !== "ok";
  return (
    <tr className={cn("border-b border-line/60 last:border-b-0 hover:bg-bg-inset/40 transition-colors group", isInactive && "opacity-60")}>
      <td className="px-3 py-2.5 sticky left-0 bg-bg-surface group-hover:bg-bg-inset/40 transition-colors overflow-hidden">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="size-7 rounded bg-accent-subtle text-accent grid place-items-center text-2xs font-bold shrink-0">
            {a.name.split(" ").slice(0, 2).map((s) => s[0]).join("") || "?"}
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-ink font-medium truncate"><Private>{a.name}</Private></div>
            <div className="font-mono text-2xs text-ink-dim truncate">{a.account_id}</div>
          </div>
          <Link
            href={`/?account=${a.account_id}`}
            className="size-5 inline-flex items-center justify-center rounded text-ink-dim hover:text-accent hover:bg-bg-elevated transition-colors cursor-pointer opacity-0 group-hover:opacity-100 shrink-0"
            aria-label="Abrir no Gerenciador"
          >
            <ExternalLink className="size-3" />
          </Link>
        </div>
      </td>
      <CellNum>{brl(a.spend)}</CellNum>
      <CellNum>{num(a.impressions)}</CellNum>
      <CellNum>{num(a.clicks)}</CellNum>
      <CellNum>{a.cpm > 0 ? brl(a.cpm) : <span className="text-ink-dim">—</span>}</CellNum>
      <CellNum>{a.cpc > 0 ? brl(a.cpc) : <span className="text-ink-dim">—</span>}</CellNum>
      <CellNum>{pct(a.ctr)}</CellNum>
      <CellNum>{num(a.purchases)}</CellNum>
      <CellNum>{a.cpa > 0 ? brl(a.cpa) : <span className="text-ink-dim">—</span>}</CellNum>
      <CellNum>
        {a.roas > 0 ? <span className="text-positive font-medium">{a.roas.toFixed(2)}×</span> : <span className="text-ink-dim">—</span>}
      </CellNum>
      <CellNum>{num(a.leads)}</CellNum>
      <CellNum className={a.frequency > 4 ? "text-warning" : undefined}>
        {a.frequency > 0 ? a.frequency.toFixed(2) : <span className="text-ink-dim">—</span>}
      </CellNum>
      <CellNum>{num(a.igVisits)}</CellNum>
      <CellNum>{num(a.reach)}</CellNum>
    </tr>
  );
}
