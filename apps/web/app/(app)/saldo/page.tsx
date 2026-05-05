"use client";

import * as React from "react";
import Link from "next/link";
import {
  Wallet,
  AlertTriangle,
  AlertCircle,
  DollarSign,
  RefreshCw,
  ExternalLink,
  MoreHorizontal,
  Search,
  Plug,
} from "lucide-react";
import { ModuleHeader } from "@/components/layout/module-header";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { EmptyState } from "@/components/layout/empty-state";
import { brl, num } from "@/lib/format";
import { Private } from "@/lib/privacy";
import { cn } from "@/lib/cn";
import { useResizableColumns, ColumnResizer, type ColumnConfig } from "@/lib/use-resizable-columns";
import {
  useMetaBalance,
  refreshAllMetaData,
  syncAccountBalance,
  type MetaBalanceRow,
} from "@/lib/hooks/use-meta";
import { useToast } from "@/components/ui/toast";

const SALDO_COLUMNS: ColumnConfig[] = [
  { id: "health",     width: 60,  minWidth: 50 },
  { id: "account",    width: 280, minWidth: 200 },
  { id: "status",     width: 110, minWidth: 90 },
  { id: "balance",    width: 130, minWidth: 100 },
  { id: "spend_day",  width: 130, minWidth: 100 },
  { id: "days_left",  width: 130, minWidth: 100 },
  { id: "campaigns",  width: 130, minWidth: 100 },
  { id: "type",       width: 110, minWidth: 80 },
  { id: "actions",    width: 80,  minWidth: 60 },
];

export default function SaldoPage() {
  const { push } = useToast();
  const [hadVeicul, setHadVeicul] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const { accounts, isLoading, error, refresh } = useMetaBalance();

  const filtered = React.useMemo(() => {
    return accounts.filter((a) => {
      if (hadVeicul && a.dailyAvg === 0 && a.spendToday === 0) return false;
      if (query && !a.name.toLowerCase().includes(query.toLowerCase())) return false;
      return true;
    });
  }, [accounts, hadVeicul, query]);

  // KPIs sempre sobre TODAS as contas (não respeitam filtros de busca/veiculação)
  const kpis = React.useMemo(() => {
    let active = 0;
    let critical = 0;
    let low = 0;
    let spentToday = 0;
    for (const a of accounts) {
      if (a.accountStatus === "active" && a.dailyAvg > 0) active++;
      if (a.health === "critical") critical++;
      if (a.health === "low") low++;
      spentToday += a.spendToday;
    }
    return { active, critical, low, spentToday };
  }, [accounts]);

  const [syncing, setSyncing] = React.useState(false);
  const handleRefresh = async () => {
    setSyncing(true);
    push({ tone: "info", title: "Atualizando saldos…", description: "Buscando da Meta." });
    try {
      await syncAccountBalance();
      refreshAllMetaData();
      await refresh();
      push({ tone: "success", title: "Saldos atualizados" });
    } catch (e: any) {
      push({ tone: "danger", title: "Erro ao sincronizar", description: e.message });
    } finally {
      setSyncing(false);
    }
  };

  // ============================================================
  // EMPTY STATES
  // ============================================================
  if (isLoading && accounts.length === 0) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-6">
        <div className="h-12 w-72 bg-bg-elevated rounded-md animate-pulse" />
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-28 bg-bg-elevated/60 rounded-xl animate-pulse" />
          ))}
        </div>
        <div className="h-[400px] bg-bg-elevated/40 rounded-xl animate-pulse" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-[1600px] mx-auto px-6 py-8">
        <EmptyState
          icon={AlertCircle}
          title="Erro ao carregar saldos"
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
          description="O Monitor de Saldo acompanha o saldo, gasto diário médio e dias restantes em cada conta conectada."
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
    <div className="max-w-[1600px] mx-auto px-6 py-8 space-y-8">
      <ModuleHeader
        eyebrow="Operação"
        title="Monitor de Saldo"
        description="Monitore saldo, status e saúde das suas contas de anúncio. Atualiza automaticamente a cada 5 minutos."
        tutorial
        actions={
          <>
            <Badge tone="info" size="sm" dot>Atualiza a cada 5 min</Badge>
            <Button variant="secondary" onClick={handleRefresh} loading={syncing}>
              {!syncing && <RefreshCw />} Atualizar
            </Button>
          </>
        }
      />

      {/* 4 KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <KpiCard
          label="Contas ativas"
          value={num(kpis.active)}
          icon={Wallet}
          tone="positive"
          hint="Veiculando neste momento"
        />
        <KpiCard
          label="Saldo crítico"
          value={num(kpis.critical)}
          icon={AlertCircle}
          tone="negative"
          hint="< 3 dias ou desativadas"
        />
        <KpiCard
          label="Saldo baixo"
          value={num(kpis.low)}
          icon={AlertTriangle}
          tone="warning"
          hint="3 a 7 dias restantes"
        />
        <KpiCard
          label="Gasto total hoje"
          value={brl(kpis.spentToday)}
          icon={DollarSign}
          tone="accent"
          hint={`Em ${accounts.length} contas`}
        />
      </div>

      {/* Filtros */}
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-72">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ink-dim pointer-events-none" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar conta…"
            className="pl-8 h-8 text-xs"
          />
        </div>
        <label className={cn(
          "h-8 px-2.5 inline-flex items-center gap-2 rounded-md border text-xs font-medium cursor-pointer transition-colors",
          hadVeicul ? "border-accent/40 bg-accent-subtle/40 text-accent" : "border-line bg-bg-surface text-ink-muted"
        )}>
          <Switch checked={hadVeicul} onCheckedChange={setHadVeicul} />
          Com veiculação
        </label>
      </div>

      <TooltipProvider delayDuration={250}>
        <PlatformSection title="Meta Ads" accounts={filtered} />
      </TooltipProvider>

      {/* Legenda */}
      <div className="flex items-center gap-5 flex-wrap pt-4 border-t border-line text-2xs text-ink-dim">
        <span className="font-medium">Legenda:</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-negative" /> &lt; 3 dias ou conta desativada</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-warning" /> 3-7 dias</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-positive" /> &gt; 7 dias / pós-pago saudável</span>
        <span className="inline-flex items-center gap-1.5"><span className="size-2 rounded-full bg-ink-dim" /> Sem gasto recente</span>
      </div>
    </div>
  );
}

function KpiCard({
  label,
  value,
  icon: Icon,
  tone,
  hint,
}: {
  label: string;
  value: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: "positive" | "negative" | "warning" | "accent";
  hint: string;
}) {
  const toneCls = {
    positive: "text-positive bg-positive-subtle",
    negative: "text-negative bg-negative-subtle",
    warning:  "text-warning  bg-warning-subtle",
    accent:   "text-accent   bg-accent-subtle",
  }[tone];

  return (
    <div className="rounded-lg border border-line bg-bg-surface p-4 hover:border-line-strong transition-colors">
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xs uppercase tracking-wider font-medium text-ink-dim">{label}</span>
        <div className={cn("size-7 rounded-md grid place-items-center shrink-0", toneCls)}>
          <Icon className="size-3.5" />
        </div>
      </div>
      <div className="mt-3 num text-2xl font-semibold text-ink">{value}</div>
      <div className="mt-1 text-2xs text-ink-dim">{hint}</div>
    </div>
  );
}

function PlatformSection({
  title,
  accounts,
}: {
  title: string;
  accounts: MetaBalanceRow[];
}) {
  const { widths, setWidth } = useResizableColumns("saldo:cols", SALDO_COLUMNS);

  return (
    <section>
      <div className="flex items-center gap-2 mb-3">
        <svg viewBox="0 0 24 24" className="size-4 text-info" fill="currentColor">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm5.5 7.5c-.83 0-1.5.67-1.5 1.5v.75h2.5v2H16v6h-2.5v-6H12v-2h1.5V11c0-1.93 1.57-3.5 3.5-3.5h1v2h-.5z" />
        </svg>
        <h2 className="text-sm font-semibold text-ink">{title}</h2>
        <Badge tone="neutral" size="xs">{accounts.length} {accounts.length === 1 ? "conta" : "contas"}</Badge>
      </div>

      {accounts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-line py-12 text-center text-sm text-ink-muted">
          Nenhuma conta {title} encontrada para esses filtros.
        </div>
      ) : (
        <div className="rounded-lg border border-line bg-bg-surface overflow-hidden">
          <div className="overflow-x-auto">
            <table className="text-xs table-fixed" style={{ width: Object.values(widths).reduce((a, b) => a + b, 0) }}>
              <colgroup>
                {SALDO_COLUMNS.map((c) => (
                  <col key={c.id} style={{ width: widths[c.id] ?? c.width }} />
                ))}
              </colgroup>
              <thead>
                <tr className="border-b border-line bg-bg-inset/50">
                  <SaldoTh widths={widths} setWidth={setWidth} colId="health" align="left">Saúde</SaldoTh>
                  <SaldoTh widths={widths} setWidth={setWidth} colId="account" align="left">Conta</SaldoTh>
                  <SaldoTh widths={widths} setWidth={setWidth} colId="status" align="left">Status</SaldoTh>
                  <SaldoTh widths={widths} setWidth={setWidth} colId="balance">Saldo</SaldoTh>
                  <SaldoTh widths={widths} setWidth={setWidth} colId="spend_day">Gasto/dia (7d)</SaldoTh>
                  <SaldoTh widths={widths} setWidth={setWidth} colId="days_left">Dias restantes</SaldoTh>
                  <SaldoTh widths={widths} setWidth={setWidth} colId="campaigns">Camp. ativas</SaldoTh>
                  <SaldoTh widths={widths} setWidth={setWidth} colId="type" align="left">Tipo</SaldoTh>
                  <SaldoTh widths={widths} setWidth={setWidth} colId="actions" align="left">Ação</SaldoTh>
                </tr>
              </thead>
              <tbody>
                {accounts
                  .slice()
                  .sort((a, b) => {
                    // Critical primeiro, depois low, depois healthy, inactive último
                    const order = { critical: 0, low: 1, healthy: 2, inactive: 3 };
                    return order[a.health] - order[b.health];
                  })
                  .map((a) => (
                    <Row key={a.id} account={a} />
                  ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </section>
  );
}

function SaldoTh({
  children,
  colId,
  widths,
  setWidth,
  align = "right",
}: {
  children?: React.ReactNode;
  colId: string;
  widths: Record<string, number>;
  setWidth: (id: string, w: number) => void;
  align?: "left" | "right";
}) {
  const defaultWidth = SALDO_COLUMNS.find((c) => c.id === colId)?.width ?? 100;
  return (
    <th className={cn(
      "relative px-3 py-2.5 text-2xs font-semibold uppercase tracking-wider text-ink-dim whitespace-nowrap overflow-hidden text-ellipsis",
      align === "left" ? "text-left" : "text-right"
    )}>
      {children}
      <ColumnResizer
        initialWidth={widths[colId]}
        onResize={(w) => setWidth(colId, w)}
        onDoubleClick={() => setWidth(colId, defaultWidth)}
      />
    </th>
  );
}

function Row({ account: a }: { account: MetaBalanceRow }) {
  const healthCls = {
    critical: "bg-negative",
    low: "bg-warning",
    healthy: "bg-positive",
    inactive: "bg-ink-dim",
  }[a.health];

  const healthLabel = {
    critical: "Saldo crítico (< 3 dias) ou desativada",
    low: "Saldo baixo (3-7 dias)",
    healthy: a.daysRemaining ? "Saudável (> 7 dias)" : "Pós-pago ativo",
    inactive: "Sem gasto recente",
  }[a.health];

  return (
    <tr className={cn(
      "border-b border-line/60 last:border-b-0 hover:bg-bg-inset/40 transition-colors",
      a.accountStatus === "disabled" && "opacity-60"
    )}>
      <td className="px-3 py-2.5">
        <Tooltip>
          <TooltipTrigger asChild>
            <span className={cn("status-dot block", healthCls)} />
          </TooltipTrigger>
          <TooltipContent>{healthLabel}</TooltipContent>
        </Tooltip>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex flex-col gap-0.5">
          <span className="text-ink font-medium truncate max-w-[260px]">
            <Private>{a.name}</Private>
          </span>
          <span className="font-mono text-2xs text-ink-dim">{a.accountId}</span>
        </div>
      </td>
      <td className="px-3 py-2.5">
        <Badge tone={a.accountStatus === "active" ? "positive" : "neutral"} size="xs" dot>
          {a.accountStatus === "active" ? "Ativa" : "Desativada"}
        </Badge>
      </td>
      <td className="px-3 py-2.5 text-right num text-ink font-medium">
        {brl(a.balance)}
      </td>
      <td className="px-3 py-2.5 text-right num text-ink-muted">
        {a.dailyAvg > 0 ? brl(a.dailyAvg) : <span className="text-ink-dim">—</span>}
      </td>
      <td className="px-3 py-2.5 text-right num">
        {a.daysRemaining == null ? (
          <span className="text-ink-dim">—</span>
        ) : (
          <span className={cn(
            "font-medium",
            a.health === "critical" ? "text-negative" :
            a.health === "low" ? "text-warning" : "text-positive"
          )}>
            {a.daysRemaining < 1 ? "< 1 dia" : `${a.daysRemaining.toFixed(1)} dias`}
          </span>
        )}
      </td>
      <td className="px-3 py-2.5 text-right num text-ink-muted">{a.activeCampaigns}</td>
      <td className="px-3 py-2.5">
        <span className="text-2xs text-ink-muted">{a.type}</span>
      </td>
      <td className="px-3 py-2.5">
        <div className="flex items-center gap-0.5">
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href={`/?account=${a.accountId}`}
                className="size-6 inline-flex items-center justify-center rounded text-ink-dim hover:text-accent hover:bg-bg-elevated transition-colors cursor-pointer"
                aria-label="Abrir no Gerenciador"
              >
                <ExternalLink className="size-3" />
              </Link>
            </TooltipTrigger>
            <TooltipContent>Abrir no Gerenciador</TooltipContent>
          </Tooltip>
          <button
            className="size-6 inline-flex items-center justify-center rounded text-ink-dim hover:text-ink hover:bg-bg-elevated transition-colors cursor-pointer"
            aria-label="Mais ações"
          >
            <MoreHorizontal className="size-3" />
          </button>
        </div>
      </td>
    </tr>
  );
}
