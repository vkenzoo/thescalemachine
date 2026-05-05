"use client";

import * as React from "react";
import useSWR from "swr";
import {
  Calendar, Sun, Moon, Trophy, AlertCircle, Lock, BarChart3, ChevronDown,
  Eye, MousePointer2, ShoppingCart, Mail, Send, Image as ImageIcon, TrendingUp,
} from "lucide-react";
import { brl, brlCompact, num, pct } from "@/lib/format";
import { cn } from "@/lib/cn";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const METRIC_LABEL: Record<string, string> = {
  spend: "Gasto",
  impressions: "Impressões",
  reach: "Alcance",
  clicks: "Cliques",
  ctr: "CTR",
  cpm: "CPM",
  cpc: "CPC",
  frequency: "Frequência",
  purchases: "Compras",
  purchase_value: "Valor Compras",
  cpa: "Custo/Compra",
  roas: "ROAS",
  leads: "Leads",
  cpl: "Custo/Lead",
  messages: "Mensagens",
  ig_visits: "Visitas IG",
  utm_revenue: "Receita Real (UTM)",
};

interface ApiResponse {
  report: {
    name: string;
    level: string;
    metrics: string[];
    sections: string[];
    funnel_steps: string[];
    ig_account: string | null;
  };
  period: string;
  totals: {
    spend: number; impressions: number; reach: number; clicks: number;
    ctr: number; cpc: number; cpm: number;
    purchases: number; purchase_value: number;
    leads: number; messages: number; ig_visits: number;
    cpa: number; cpl: number; roas: number;
    utm_revenue: number;
  };
  accounts: Array<{ account_id: string; name: string; spend: number; impressions: number; reach: number; clicks: number; }>;
  campaigns: Array<{
    account_id: string; campaign_id: string; name: string;
    spend: number; impressions: number; reach: number; clicks: number;
    ctr: number; cpc: number; cpm: number; frequency: number;
    purchases: number; purchase_value: number;
  }>;
}

interface PrivateResponse { error: "private" | "not_found" }
interface PasswordResponse { requires_password: true; name: string }

const PERIODS = [
  { id: "today", label: "Hoje" },
  { id: "yesterday", label: "Ontem" },
  { id: "last_7d", label: "Últimos 7 dias" },
  { id: "last_14d", label: "Últimos 14 dias" },
  { id: "last_30d", label: "Últimos 30 dias" },
  { id: "this_month", label: "Este mês" },
  { id: "last_month", label: "Mês passado" },
  { id: "maximum", label: "Tudo" },
];

export default function PublicReportPage({ params }: { params: { slug: string } }) {
  const [period, setPeriod] = React.useState("last_30d");
  const [password, setPassword] = React.useState("");
  const [submittedPassword, setSubmittedPassword] = React.useState<string | null>(null);
  const [dark, setDark] = React.useState(true);

  React.useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const fetcher = (url: string) => fetch(url, {
    headers: submittedPassword ? { "x-report-password": submittedPassword } : {},
  }).then(async (r) => {
    if (r.status === 401) return { ...(await r.json()), _401: true };
    if (r.status === 403) return { error: "private" };
    if (r.status === 404) return { error: "not_found" };
    return r.json();
  });

  const url = `/api/reports/public/${params.slug}?period=${period}`;
  const { data, isLoading } = useSWR<ApiResponse | PrivateResponse | (PasswordResponse & { _401: true })>(url, fetcher);

  if (isLoading) {
    return <FullPageMessage>Carregando relatório…</FullPageMessage>;
  }

  if (!data) {
    return <FullPageMessage>Erro ao carregar.</FullPageMessage>;
  }

  if ((data as any)._401) {
    return (
      <PasswordPrompt
        name={(data as PasswordResponse).name}
        password={password}
        setPassword={setPassword}
        onSubmit={() => setSubmittedPassword(password)}
      />
    );
  }

  if ((data as PrivateResponse).error === "not_found") {
    return <FullPageMessage>Relatório não encontrado.</FullPageMessage>;
  }
  if ((data as PrivateResponse).error === "private") {
    return <FullPageMessage>Esse relatório está privado.</FullPageMessage>;
  }

  const r = data as ApiResponse;
  const t = r.totals;

  const sections = new Set(r.report.sections);
  const showCampaigns = r.campaigns.length > 0;

  return (
    <div className="min-h-screen bg-bg-base">
      <header className="border-b border-line bg-bg-surface">
        <div className="max-w-[1280px] mx-auto px-6 py-5 flex items-center justify-between gap-4">
          <div className="min-w-0">
            <h1 className="font-display text-xl font-bold text-ink truncate">{r.report.name}</h1>
            <p className="text-2xs text-ink-muted">
              {r.accounts.length} {r.accounts.length === 1 ? "conta" : "contas"} · {r.report.level}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Select value={period} onValueChange={setPeriod}>
              <SelectTrigger className="w-[180px]"><Calendar className="size-4 mr-1" /><SelectValue /></SelectTrigger>
              <SelectContent>
                {PERIODS.map((p) => <SelectItem key={p.id} value={p.id}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
            <button
              onClick={() => setDark((d) => !d)}
              className="size-9 rounded-md border border-line bg-bg-surface text-ink-muted hover:text-ink grid place-items-center"
              aria-label="Alternar tema"
            >
              {dark ? <Sun className="size-4" /> : <Moon className="size-4" />}
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-[1280px] mx-auto px-6 py-8 space-y-6">
        {/* KPIs */}
        <KpiGrid metrics={r.report.metrics} totals={t} />

        {/* Funil */}
        {sections.has("funnel") && r.report.funnel_steps.length > 0 && (
          <FunnelSection steps={r.report.funnel_steps} totals={t} />
        )}

        {/* Top campanhas */}
        {sections.has("topCamp") && showCampaigns && (
          <TopCampaignsSection campaigns={r.campaigns.slice(0, 3)} />
        )}

        {/* Distribuição em pizza */}
        {sections.has("pie") && showCampaigns && (
          <DistributionSection campaigns={r.campaigns.slice(0, 6)} totalSpend={t.spend} />
        )}

        {/* Tabela completa de campanhas */}
        {showCampaigns && <CampaignsTable campaigns={r.campaigns} />}

        <footer className="text-center text-2xs text-ink-dim pt-6 pb-4">
          Powered by Ad Manager · {new Date().toLocaleDateString("pt-BR")}
        </footer>
      </main>
    </div>
  );
}

// ============================================================
function KpiGrid({ metrics, totals }: { metrics: string[]; totals: ApiResponse["totals"] }) {
  // Map dos valores formatados pra cada métrica conhecida
  const valueMap: Record<string, { value: string; sub?: string }> = {
    spend: { value: brl(totals.spend) },
    impressions: { value: num(totals.impressions) },
    reach: { value: num(totals.reach) },
    clicks: { value: num(totals.clicks) },
    ctr: { value: pct(totals.ctr) },
    cpc: { value: brl(totals.cpc) },
    cpm: { value: brl(totals.cpm) },
    purchases: { value: num(totals.purchases) },
    purchase_value: { value: brl(totals.purchase_value) },
    cpa: { value: totals.cpa ? brl(totals.cpa) : "—" },
    roas: { value: totals.roas.toFixed(2) + "×" },
    leads: { value: num(totals.leads) },
    cpl: { value: totals.cpl ? brl(totals.cpl) : "—" },
    messages: { value: num(totals.messages) },
    ig_visits: { value: num(totals.ig_visits) },
    utm_revenue: { value: brl(totals.utm_revenue), sub: "via webhook gateway" },
  };

  // Filtra: só métricas selecionadas que conhecemos
  const visible = metrics.filter((m) => valueMap[m]);
  if (visible.length === 0) return null;

  return (
    <section className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
      {visible.map((m) => (
        <div key={m} className="rounded-xl border border-line bg-bg-surface p-4">
          <p className="text-2xs uppercase tracking-wider text-ink-dim font-medium">{METRIC_LABEL[m] ?? m}</p>
          <p className="font-display text-2xl font-bold text-ink tabular-nums mt-1">{valueMap[m].value}</p>
          {valueMap[m].sub && <p className="text-2xs text-ink-muted mt-0.5">{valueMap[m].sub}</p>}
        </div>
      ))}
    </section>
  );
}

// ============================================================
function FunnelSection({ steps, totals }: { steps: string[]; totals: ApiResponse["totals"] }) {
  const STEP_VALUE: Record<string, number> = {
    "Impressões": totals.impressions,
    "Alcance": totals.reach,
    "Cliques": totals.clicks,
    "Resultados": totals.purchases,
    "Compras": totals.purchases,
    "Leads": totals.leads,
    "Mensagens": totals.messages,
    "Visitas IG": totals.ig_visits,
    "Compras UTMs": totals.purchases,
  };

  const items = steps.map((s) => ({ label: s, value: STEP_VALUE[s] ?? 0 })).filter((s) => s.value > 0);
  if (items.length === 0) return null;
  const max = Math.max(...items.map((i) => i.value));

  return (
    <section className="rounded-xl border border-line bg-bg-surface p-5 space-y-3">
      <h2 className="text-md font-semibold text-ink flex items-center gap-2">
        <BarChart3 className="size-4 text-accent" />
        Funil
      </h2>
      <ul className="space-y-2">
        {items.map((s) => {
          const w = max > 0 ? (s.value / max) * 100 : 0;
          return (
            <li key={s.label} className="flex items-center gap-3">
              <span className="text-xs text-ink-muted w-32 shrink-0">{s.label}</span>
              <div className="flex-1 h-7 rounded-md bg-bg-inset overflow-hidden relative">
                <div className="h-full bg-accent/70" style={{ width: `${w}%` }} />
                <span className="absolute inset-0 flex items-center px-3 text-xs font-medium text-ink tabular-nums">
                  {num(s.value)}
                </span>
              </div>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ============================================================
function TopCampaignsSection({ campaigns }: { campaigns: ApiResponse["campaigns"] }) {
  return (
    <section className="rounded-xl border border-line bg-bg-surface p-5 space-y-3">
      <h2 className="text-md font-semibold text-ink flex items-center gap-2">
        <Trophy className="size-4 text-warning" />
        Melhores campanhas (Top 3)
      </h2>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
        {campaigns.map((c, i) => (
          <div key={c.campaign_id} className="rounded-lg border border-line bg-bg-base p-4 space-y-2">
            <div className="flex items-center gap-2">
              <span className={cn(
                "size-7 rounded-full grid place-items-center text-2xs font-bold",
                i === 0 ? "bg-warning/20 text-warning" :
                i === 1 ? "bg-info/20 text-info" :
                "bg-ink-muted/20 text-ink-muted"
              )}>{i + 1}º</span>
              <p className="text-sm font-medium text-ink truncate flex-1">{c.name}</p>
            </div>
            <div className="grid grid-cols-2 gap-2 text-2xs">
              <Stat label="Gasto" value={brl(c.spend)} />
              <Stat label="ROAS" value={c.spend > 0 && c.purchase_value > 0 ? (c.purchase_value / c.spend).toFixed(2) + "×" : "—"} />
              <Stat label="Cliques" value={num(c.clicks)} />
              <Stat label="CTR" value={pct(c.ctr)} />
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-ink-dim uppercase tracking-wider">{label}</p>
      <p className="font-medium text-ink tabular-nums mt-0.5">{value}</p>
    </div>
  );
}

// ============================================================
function DistributionSection({ campaigns, totalSpend }: { campaigns: ApiResponse["campaigns"]; totalSpend: number }) {
  const COLORS = ["#3B82F6", "#22C55E", "#F59E0B", "#EF4444", "#A855F7", "#94A3B8"];
  return (
    <section className="rounded-xl border border-line bg-bg-surface p-5 space-y-3">
      <h2 className="text-md font-semibold text-ink">Distribuição de gasto</h2>
      <ul className="space-y-2">
        {campaigns.map((c, i) => {
          const pctVal = totalSpend > 0 ? (c.spend / totalSpend) * 100 : 0;
          return (
            <li key={c.campaign_id} className="flex items-center gap-3">
              <span className="size-3 rounded-sm shrink-0" style={{ backgroundColor: COLORS[i % COLORS.length] }} />
              <span className="text-xs text-ink truncate flex-1">{c.name}</span>
              <span className="text-2xs font-mono text-ink-muted w-14 text-right">{pctVal.toFixed(1)}%</span>
              <span className="text-2xs font-mono text-ink-dim w-20 text-right">{brl(c.spend)}</span>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

// ============================================================
function CampaignsTable({ campaigns }: { campaigns: ApiResponse["campaigns"] }) {
  return (
    <section className="rounded-xl border border-line bg-bg-surface overflow-hidden">
      <div className="px-5 py-4 border-b border-line">
        <h2 className="text-md font-semibold text-ink">Todas as campanhas</h2>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="bg-bg-inset/50">
            <tr className="text-2xs uppercase tracking-wider text-ink-dim">
              <th className="text-left px-5 py-2.5 font-medium">Nome</th>
              <th className="text-right px-3 py-2.5 font-medium">Gasto</th>
              <th className="text-right px-3 py-2.5 font-medium">Impressões</th>
              <th className="text-right px-3 py-2.5 font-medium">Cliques</th>
              <th className="text-right px-3 py-2.5 font-medium">CTR</th>
              <th className="text-right px-3 py-2.5 font-medium">CPC</th>
              <th className="text-right px-3 py-2.5 font-medium">Compras</th>
              <th className="text-right px-3 py-2.5 font-medium">ROAS</th>
            </tr>
          </thead>
          <tbody>
            {campaigns.map((c) => {
              const roas = c.spend > 0 && c.purchase_value > 0 ? c.purchase_value / c.spend : 0;
              return (
                <tr key={c.campaign_id} className="border-t border-line hover:bg-bg-inset/30">
                  <td className="px-5 py-2.5 text-ink truncate max-w-[280px]">{c.name}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink">{brl(c.spend)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink-muted">{num(c.impressions)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink-muted">{num(c.clicks)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink-muted">{pct(c.ctr)}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink-muted">{c.cpc > 0 ? brl(c.cpc) : "—"}</td>
                  <td className="px-3 py-2.5 text-right tabular-nums text-ink-muted">{num(c.purchases)}</td>
                  <td className={cn(
                    "px-3 py-2.5 text-right tabular-nums font-medium",
                    roas >= 1 ? "text-positive" : roas > 0 ? "text-warning" : "text-ink-muted"
                  )}>{roas > 0 ? roas.toFixed(2) + "×" : "—"}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}

// ============================================================
function PasswordPrompt({
  name, password, setPassword, onSubmit,
}: { name: string; password: string; setPassword: (s: string) => void; onSubmit: () => void }) {
  return (
    <div className="min-h-screen grid place-items-center bg-bg-base p-6">
      <form
        onSubmit={(e) => { e.preventDefault(); onSubmit(); }}
        className="w-full max-w-sm rounded-xl border border-line bg-bg-surface p-6 space-y-4"
      >
        <div className="text-center space-y-2">
          <div className="size-12 rounded-full bg-warning/15 text-warning grid place-items-center mx-auto">
            <Lock className="size-5" />
          </div>
          <h1 className="text-md font-semibold text-ink">{name}</h1>
          <p className="text-2xs text-ink-muted">Esse relatório está protegido por senha.</p>
        </div>
        <Input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Senha"
          autoFocus
        />
        <Button type="submit" variant="primary" className="w-full" disabled={!password}>
          Ver relatório
        </Button>
      </form>
    </div>
  );
}

function FullPageMessage({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen grid place-items-center bg-bg-base p-6 text-center">
      <div className="space-y-2">
        <AlertCircle className="size-6 mx-auto text-ink-muted" />
        <p className="text-sm text-ink">{children}</p>
      </div>
    </div>
  );
}
