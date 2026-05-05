"use client";

import * as React from "react";
import useSWR from "swr";
import Link from "next/link";
import { TrendingUp, AlertCircle, Activity, ChevronRight } from "lucide-react";
import { brl } from "@/lib/format";
import type { Period } from "@/lib/hooks/use-meta";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function periodToRange(period: Period): { from: string; to: string } {
  const now = new Date();
  const end = new Date(now);
  const start = new Date(now);
  switch (period) {
    case "today": start.setHours(0, 0, 0, 0); break;
    case "yesterday":
      start.setDate(start.getDate() - 1); start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1); end.setHours(23, 59, 59, 999); break;
    case "last_7d": start.setDate(start.getDate() - 7); break;
    case "last_30d": start.setDate(start.getDate() - 30); break;
    case "this_month": start.setDate(1); start.setHours(0, 0, 0, 0); break;
    case "last_month":
      start.setMonth(start.getMonth() - 1); start.setDate(1); start.setHours(0, 0, 0, 0);
      end.setDate(0); end.setHours(23, 59, 59, 999); break;
    case "maximum": start.setFullYear(start.getFullYear() - 2); break;
  }
  return { from: start.toISOString(), to: end.toISOString() };
}

export function AttributedSalesBar({
  accountId, period, totalSpend,
}: {
  accountId: string | null;
  period: Period;
  totalSpend: number; // BRL, vindo do MetricCards
}) {
  const { from, to } = React.useMemo(() => periodToRange(period), [period]);
  const url = accountId
    ? `/api/integracoes/attribution/summary?from=${from}&to=${to}&account=${accountId}`
    : `/api/integracoes/attribution/summary?from=${from}&to=${to}`;

  const { data, isLoading } = useSWR<{
    totals: {
      sales: number; revenue_cents: number;
      refunds: number; refunded_revenue_cents: number;
      direct_sales: number; direct_revenue_cents: number;
    };
    by_campaign: Array<{ meta_id: string; sales: number; revenue_cents: number }>;
  }>(url, fetcher, { refreshInterval: 30_000 });

  if (isLoading || !data) return null;

  const t = data.totals;
  if (t.sales === 0 && t.refunds === 0) return null;

  const revenue = t.revenue_cents / 100;
  const refundedRev = t.refunded_revenue_cents / 100;
  const netRevenue = revenue - refundedRev;
  const roas = totalSpend > 0 ? netRevenue / totalSpend : null;
  const directPct = t.sales > 0 ? Math.round((t.direct_sales / (t.sales + t.direct_sales)) * 100) : 0;

  return (
    <section className="rounded-2xl border border-positive/30 bg-positive-subtle/10 p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <div className="size-7 rounded-md bg-positive/20 text-positive grid place-items-center">
            <TrendingUp className="size-4" />
          </div>
          <p className="text-xs font-semibold text-ink uppercase tracking-wider">
            Vendas atribuídas <span className="text-2xs text-ink-muted normal-case font-normal">(via UTM dos gateways)</span>
          </p>
        </div>
        <Link
          href="/integracoes/saude"
          className="text-2xs text-accent hover:underline inline-flex items-center gap-0.5"
        >
          Ver saúde da atribuição <ChevronRight className="size-3" />
        </Link>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Receita real" value={brl(netRevenue)} hint={`${t.sales} venda${t.sales === 1 ? "" : "s"}`} />
        <Stat
          label="ROAS real"
          value={roas != null ? `${roas.toFixed(2)}×` : "—"}
          hint={totalSpend > 0 ? `gasto ${brl(totalSpend)}` : "sem gasto no período"}
          tone={roas != null && roas >= 1 ? "positive" : roas != null ? "negative" : "neutral"}
        />
        <Stat
          label="Reembolsos"
          value={t.refunds > 0 ? `-${brl(refundedRev)}` : "R$ 0"}
          hint={t.refunds > 0 ? `${t.refunds} desconta${t.refunds === 1 ? "do" : "dos"}` : "nenhum"}
          tone={t.refunds > 0 ? "negative" : "neutral"}
        />
        <Stat
          label="Direto/Outros"
          value={`${directPct}%`}
          hint={t.direct_sales > 0 ? `${t.direct_sales} sem match` : "tudo atribuído"}
          tone={directPct > 20 ? "warning" : "neutral"}
        />
      </div>
    </section>
  );
}

function Stat({
  label, value, hint, tone,
}: { label: string; value: string; hint?: string; tone?: "positive" | "negative" | "warning" | "neutral" }) {
  const valueClass =
    tone === "positive" ? "text-positive" :
    tone === "negative" ? "text-negative" :
    tone === "warning" ? "text-warning" :
    "text-ink";
  return (
    <div>
      <p className="text-2xs text-ink-muted uppercase tracking-wide font-medium">{label}</p>
      <p className={`font-display text-2xl font-bold tabular-nums mt-0.5 ${valueClass}`}>{value}</p>
      {hint && <p className="text-2xs text-ink-dim mt-0.5">{hint}</p>}
    </div>
  );
}
