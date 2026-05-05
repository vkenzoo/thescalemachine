"use client";

import * as React from "react";
import useSWR from "swr";
import Link from "next/link";
import {
  ArrowLeft, AlertCircle, CheckCircle2, TrendingUp, Activity,
  Package, Layers, ShoppingBag,
} from "lucide-react";
import { ModuleHeader } from "@/components/layout/module-header";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { brl } from "@/lib/format";
import { cn } from "@/lib/cn";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

type Period = "last_7d" | "last_30d" | "last_90d";

const PERIOD_LABEL: Record<Period, string> = {
  last_7d: "Últimos 7 dias",
  last_30d: "Últimos 30 dias",
  last_90d: "Últimos 90 dias",
};

function periodToRange(period: Period) {
  const now = new Date();
  const end = now.toISOString();
  const days = period === "last_7d" ? 7 : period === "last_30d" ? 30 : 90;
  const start = new Date(now.getTime() - days * 86400000).toISOString();
  return { from: start, to: end };
}

const METHOD_LABELS: Record<string, string> = {
  utm_id: "Match perfeito (utm_id)",
  utm_term_ad_id: "Match perfeito (utm_term)",
  triple_utm: "Match composto (3 UTMs)",
  utm_campaign_only: "Só campanha",
  fuzzy_campaign_name: "Fuzzy por nome",
};

const METHOD_TONES: Record<string, "positive" | "neutral" | "warning"> = {
  utm_id: "positive",
  utm_term_ad_id: "positive",
  triple_utm: "positive",
  utm_campaign_only: "neutral",
  fuzzy_campaign_name: "warning",
};

export default function SaudeAtribuicaoPage() {
  const [period, setPeriod] = React.useState<Period>("last_30d");
  const [tab, setTab] = React.useState<"saude" | "produtos">("saude");

  const { from, to } = React.useMemo(() => periodToRange(period), [period]);

  return (
    <div className="max-w-[1200px] mx-auto px-6 py-8 space-y-6">
      <div className="flex items-center gap-2 text-2xs">
        <Link href="/integracoes" className="text-ink-muted hover:text-accent inline-flex items-center gap-1">
          <ArrowLeft className="size-3" /> Integrações UTMs
        </Link>
      </div>

      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <ModuleHeader
          eyebrow="Operação · UTMs"
          title="Saúde da Atribuição"
          description="Veja a qualidade do match das suas vendas e descubra onde os UTMs estão falhando."
        />
        <Select value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            {(Object.keys(PERIOD_LABEL) as Period[]).map((p) => (
              <SelectItem key={p} value={p}>{PERIOD_LABEL[p]}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="space-y-5">
        <TabsList>
          <TabsTrigger value="saude"><Activity className="size-4" />Match rate</TabsTrigger>
          <TabsTrigger value="produtos"><Package className="size-4" />Por produto</TabsTrigger>
        </TabsList>

        <TabsContent value="saude" className="space-y-5">
          <SaudeTab from={from} to={to} />
        </TabsContent>

        <TabsContent value="produtos" className="space-y-5">
          <ProdutosTab from={from} to={to} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ============================================================
function SaudeTab({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useSWR<{
    total: number;
    matched: number;
    unmatched: number;
    match_rate: number | null;
    avg_confidence: number | null;
    by_method: Record<string, number>;
    recent_unmatched: Array<{
      sale_id: string; occurred_at: string; gateway: string;
      product_name: string | null; gross_value_cents: number | null;
      utm_campaign: string | null; utm_content: string | null; utm_term: string | null;
    }>;
  }>(`/api/integracoes/attribution/health?from=${from}&to=${to}`, fetcher);

  if (isLoading) return <p className="text-sm text-ink-muted">Carregando…</p>;
  if (!data) return null;

  const matchPct = data.match_rate != null ? Math.round(data.match_rate * 100) : null;
  const avgConfPct = data.avg_confidence != null ? Math.round(data.avg_confidence * 100) : null;

  const tone =
    matchPct == null ? "neutral" :
    matchPct >= 90 ? "positive" :
    matchPct >= 70 ? "warning" :
    "negative";

  if (data.total === 0) {
    return (
      <div className="rounded-2xl border border-line bg-bg-surface p-10 text-center space-y-4">
        <div className="size-14 mx-auto rounded-full bg-bg-inset grid place-items-center">
          <Activity className="size-6 text-ink-muted" />
        </div>
        <div>
          <p className="text-md font-semibold text-ink">Sem vendas no período</p>
          <p className="text-2xs text-ink-muted mt-1">
            Aqui aparecem todas as vendas aprovadas que chegaram pelos webhooks dos seus gateways.
          </p>
        </div>
        <div className="text-2xs text-ink-muted max-w-md mx-auto space-y-2 pt-2 border-t border-line">
          <p className="font-medium text-ink">Pra começar:</p>
          <ol className="text-left space-y-1.5 list-decimal list-inside">
            <li>Crie um projeto em <Link href="/integracoes" className="text-accent hover:underline">Integrações UTMs</Link></li>
            <li>Cadastre o token do gateway e cole a URL do webhook</li>
            <li>Faça uma venda de teste pelo botão "Enviar venda de teste"</li>
            <li>A venda aparece aqui em segundos com a campanha atribuída</li>
          </ol>
        </div>
      </div>
    );
  }

  return (
    <>
      {/* Resumo */}
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <BigStat label="Vendas" value={data.total.toString()} />
        <BigStat
          label="Match rate"
          value={matchPct != null ? `${matchPct}%` : "—"}
          tone={tone === "positive" ? "positive" : tone === "warning" ? "warning" : tone === "negative" ? "negative" : undefined}
          hint={matchPct != null && matchPct < 80 ? "Abaixo do recomendado (80%)" : undefined}
        />
        <BigStat label="Confiança média" value={avgConfPct != null ? `${avgConfPct}%` : "—"} />
        <BigStat
          label="Sem match"
          value={data.unmatched.toString()}
          tone={data.unmatched > 0 ? "warning" : undefined}
        />
      </section>

      {/* Breakdown por método */}
      <section className="rounded-2xl border border-line bg-bg-surface p-5 space-y-3">
        <h2 className="text-md font-semibold text-ink">Como suas vendas são casadas</h2>
        {Object.keys(data.by_method).length === 0 ? (
          <p className="text-sm text-ink-muted">Nenhum match no período.</p>
        ) : (
          <ul className="space-y-2">
            {Object.entries(data.by_method)
              .sort((a, b) => b[1] - a[1])
              .map(([method, count]) => {
                const pct = data.total > 0 ? (count / data.total) * 100 : 0;
                const t = METHOD_TONES[method] ?? "neutral";
                return (
                  <li key={method} className="flex items-center gap-3">
                    <span className="text-xs text-ink min-w-[200px]">{METHOD_LABELS[method] ?? method}</span>
                    <div className="flex-1 h-2 rounded-full bg-bg-inset overflow-hidden">
                      <div
                        className={cn(
                          "h-full",
                          t === "positive" ? "bg-positive" :
                          t === "warning" ? "bg-warning" : "bg-ink-muted"
                        )}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <span className="text-2xs font-mono text-ink-muted w-12 text-right">{pct.toFixed(0)}%</span>
                    <span className="text-2xs text-ink-dim w-8 text-right">{count}</span>
                  </li>
                );
              })}
          </ul>
        )}
      </section>

      {/* Vendas sem match */}
      <section className="rounded-2xl border border-line bg-bg-surface p-5 space-y-3">
        <div className="flex items-baseline justify-between">
          <h2 className="text-md font-semibold text-ink">Vendas sem match (Direct/Outros)</h2>
          {data.recent_unmatched.length > 0 && (
            <Badge tone="warning" size="xs">{data.recent_unmatched.length}</Badge>
          )}
        </div>
        {data.recent_unmatched.length === 0 ? (
          <p className="text-2xs text-ink-muted flex items-center gap-1.5">
            <CheckCircle2 className="size-3.5 text-positive" /> Nenhuma venda sem match — seus UTMs estão bons.
          </p>
        ) : (
          <div className="space-y-1.5">
            {data.recent_unmatched.map((s) => (
              <div key={s.sale_id} className="rounded-md border border-line bg-bg-base p-3">
                <div className="flex items-center gap-3 text-2xs">
                  <span className="font-mono text-ink-dim w-32 shrink-0">
                    {new Date(s.occurred_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                  </span>
                  <Badge tone="neutral" size="xs">{s.gateway}</Badge>
                  <span className="text-ink truncate flex-1">{s.product_name ?? "—"}</span>
                  <span className="font-medium text-ink">
                    {s.gross_value_cents != null ? brl(s.gross_value_cents / 100) : "—"}
                  </span>
                </div>
                <div className="mt-1.5 text-2xs text-ink-dim font-mono break-all">
                  {s.utm_campaign && <span>utm_campaign={s.utm_campaign} </span>}
                  {s.utm_content && <span>utm_content={s.utm_content} </span>}
                  {s.utm_term && <span>utm_term={s.utm_term}</span>}
                  {!s.utm_campaign && !s.utm_content && !s.utm_term && (
                    <span className="text-warning">Sem UTMs no payload — verifique se você colocou o template no Meta.</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </>
  );
}

// ============================================================
function ProdutosTab({ from, to }: { from: string; to: string }) {
  const { data, isLoading } = useSWR<{
    products: Array<{
      product_name: string;
      sales: number;
      revenue_cents: number;
      by_gateway: Record<string, { sales: number; revenue_cents: number }>;
    }>;
  }>(`/api/integracoes/attribution/by-product?from=${from}&to=${to}`, fetcher);

  if (isLoading) return <p className="text-sm text-ink-muted">Carregando…</p>;
  if (!data || data.products.length === 0) {
    return (
      <div className="rounded-2xl border border-line bg-bg-surface p-10 text-center space-y-3">
        <div className="size-14 mx-auto rounded-full bg-bg-inset grid place-items-center">
          <Package className="size-6 text-ink-muted" />
        </div>
        <div>
          <p className="text-md font-semibold text-ink">Sem vendas no período</p>
          <p className="text-2xs text-ink-muted mt-1 max-w-md mx-auto">
            Quando vendas chegarem dos seus gateways, esta tela mostra a receita por produto cross-plataforma —
            ex: o mesmo curso vendendo em Hotmart + Kiwify.
          </p>
        </div>
        <Link href="/integracoes" className="text-2xs text-accent hover:underline inline-flex items-center gap-1">
          Configurar projetos UTM →
        </Link>
      </div>
    );
  }

  const totalRev = data.products.reduce((s, p) => s + p.revenue_cents, 0);

  return (
    <section className="rounded-2xl border border-line bg-bg-surface overflow-hidden">
      <table className="w-full text-sm">
        <thead className="bg-bg-inset/50">
          <tr className="text-2xs uppercase tracking-wider text-ink-dim">
            <th className="text-left px-5 py-3 font-medium">Produto</th>
            <th className="text-right px-3 py-3 font-medium">Vendas</th>
            <th className="text-right px-3 py-3 font-medium">Receita</th>
            <th className="text-right px-3 py-3 font-medium">% do total</th>
            <th className="text-left px-5 py-3 font-medium">Por gateway</th>
          </tr>
        </thead>
        <tbody>
          {data.products.map((p) => {
            const pct = totalRev > 0 ? (p.revenue_cents / totalRev) * 100 : 0;
            return (
              <tr key={p.product_name} className="border-t border-line">
                <td className="px-5 py-3 font-medium text-ink">{p.product_name}</td>
                <td className="px-3 py-3 text-right tabular-nums text-ink">{p.sales}</td>
                <td className="px-3 py-3 text-right tabular-nums font-medium text-ink">{brl(p.revenue_cents / 100)}</td>
                <td className="px-3 py-3 text-right tabular-nums text-ink-muted">{pct.toFixed(0)}%</td>
                <td className="px-5 py-3">
                  <div className="flex flex-wrap gap-1.5">
                    {Object.entries(p.by_gateway).map(([gw, agg]) => (
                      <Badge key={gw} tone="neutral" size="xs">
                        {gw}: {agg.sales} · {brl(agg.revenue_cents / 100)}
                      </Badge>
                    ))}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </section>
  );
}

// ============================================================
function BigStat({
  label, value, hint, tone,
}: {
  label: string; value: string; hint?: string;
  tone?: "positive" | "warning" | "negative";
}) {
  const cls =
    tone === "positive" ? "text-positive" :
    tone === "warning" ? "text-warning" :
    tone === "negative" ? "text-negative" :
    "text-ink";
  return (
    <div className="rounded-2xl border border-line bg-bg-surface p-4">
      <p className="text-2xs uppercase tracking-wider text-ink-dim font-medium">{label}</p>
      <p className={cn("font-display text-3xl font-bold tabular-nums mt-1", cls)}>{value}</p>
      {hint && <p className="text-2xs text-ink-muted mt-1">{hint}</p>}
    </div>
  );
}
