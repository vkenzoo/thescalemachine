"use client";

import * as React from "react";
import useSWR from "swr";
import {
  AlertTriangle, AlertCircle, Info, Activity, Users, Database, Webhook,
  ChevronRight, X, RefreshCw, ShieldAlert, ChevronDown, Search,
} from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/cn";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

interface AuditEvent {
  id: string;
  created_at: string;
  severity: "info" | "warning" | "error";
  area: string;
  message: string;
  user_id: string | null;
  user_email: string | null;
  tags: Record<string, string>;
  extra: Record<string, any>;
  stack: string | null;
}

export default function AdminPage() {
  return (
    <div className="min-h-screen bg-bg-base">
      <header className="border-b border-line bg-bg-surface">
        <div className="max-w-[1400px] mx-auto px-6 py-5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="size-9 rounded-md bg-negative-subtle text-negative grid place-items-center">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <p className="text-2xs uppercase tracking-wider text-ink-dim">Admin · Backoffice</p>
              <h1 className="font-display text-lg font-bold text-ink">TheScaleMachine Ops</h1>
            </div>
          </div>
          <a href="/" className="text-2xs text-ink-muted hover:text-ink">← voltar pro app</a>
        </div>
      </header>

      <main className="max-w-[1400px] mx-auto px-6 py-6">
        <Tabs defaultValue="events" className="space-y-5">
          <TabsList>
            <TabsTrigger value="events"><Activity className="size-3.5" />Atividade & Erros</TabsTrigger>
            <TabsTrigger value="health"><Webhook className="size-3.5" />Saúde do sistema</TabsTrigger>
            <TabsTrigger value="users"><Users className="size-3.5" />Usuários</TabsTrigger>
            <TabsTrigger value="db"><Database className="size-3.5" />Banco</TabsTrigger>
          </TabsList>

          <TabsContent value="events"><EventsTab /></TabsContent>
          <TabsContent value="health"><HealthTab /></TabsContent>
          <TabsContent value="users"><UsersTab /></TabsContent>
          <TabsContent value="db"><DbTab /></TabsContent>
        </Tabs>
      </main>
    </div>
  );
}

// ============================================================
function EventsTab() {
  const [severity, setSeverity] = React.useState<string>("all");
  const [area, setArea] = React.useState<string>("all");
  const [drilldown, setDrilldown] = React.useState<AuditEvent | null>(null);

  const url = `/api/admin/events?limit=200${severity !== "all" ? `&severity=${severity}` : ""}${area !== "all" ? `&area=${area}` : ""}`;
  const { data, isLoading, mutate } = useSWR<{ events: AuditEvent[] }>(url, fetcher, {
    refreshInterval: 30_000,
  });
  const events = data?.events ?? [];

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={severity} onValueChange={setSeverity}>
          <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas severidades</SelectItem>
            <SelectItem value="error">🔴 Errors</SelectItem>
            <SelectItem value="warning">🟡 Warnings</SelectItem>
            <SelectItem value="info">ℹ️ Info</SelectItem>
          </SelectContent>
        </Select>
        <Select value={area} onValueChange={setArea}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas áreas</SelectItem>
            <SelectItem value="webhook">Webhooks</SelectItem>
            <SelectItem value="resolver">Resolver UTM</SelectItem>
            <SelectItem value="cron-rules">Cron Rules</SelectItem>
            <SelectItem value="cron-alerts">Cron Alerts</SelectItem>
            <SelectItem value="meta-sync">Meta Sync</SelectItem>
            <SelectItem value="api">API</SelectItem>
          </SelectContent>
        </Select>
        <Badge tone="neutral" size="xs">{events.length} eventos</Badge>
        <Button variant="ghost" size="sm" onClick={() => mutate()}>
          <RefreshCw className="size-3.5" />
        </Button>
      </div>

      {isLoading && events.length === 0 ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-md bg-bg-elevated/40 animate-pulse" />
          ))}
        </div>
      ) : events.length === 0 ? (
        <div className="text-center py-16 text-ink-muted text-sm">
          Nenhum evento. Tudo funcionando 🎉
        </div>
      ) : (
        <div className="rounded-xl border border-line bg-bg-surface divide-y divide-line">
          {events.map((e) => (
            <button
              key={e.id}
              onClick={() => setDrilldown(e)}
              className="w-full text-left px-4 py-2.5 hover:bg-bg-inset/40 transition-colors flex items-center gap-3"
            >
              <SeverityIcon sev={e.severity} />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-ink truncate">{e.message}</p>
                <p className="text-2xs text-ink-dim mt-0.5">
                  <span className="font-mono">{e.area}</span>
                  {e.user_email && <span> · {e.user_email}</span>}
                  {Object.keys(e.tags).length > 0 && (
                    <span> · {Object.entries(e.tags).map(([k, v]) => `${k}=${v}`).join(" ")}</span>
                  )}
                </p>
              </div>
              <span className="text-2xs text-ink-dim font-mono whitespace-nowrap">
                {timeAgo(e.created_at)}
              </span>
              <ChevronRight className="size-3.5 text-ink-dim" />
            </button>
          ))}
        </div>
      )}

      {drilldown && (
        <EventDrawer event={drilldown} onClose={() => setDrilldown(null)} />
      )}
    </div>
  );
}

function SeverityIcon({ sev }: { sev: string }) {
  const Icon = sev === "error" ? AlertCircle : sev === "warning" ? AlertTriangle : Info;
  const cls = sev === "error" ? "text-negative" : sev === "warning" ? "text-warning" : "text-info";
  return <Icon className={cn("size-4 shrink-0", cls)} />;
}

function EventDrawer({ event, onClose }: { event: AuditEvent; onClose: () => void }) {
  return (
    <>
      <div className="fixed inset-0 bg-black/60 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-full max-w-xl bg-bg-surface border-l border-line z-50 overflow-y-auto">
        <div className="px-5 py-4 border-b border-line flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0">
            <SeverityIcon sev={event.severity} />
            <div className="min-w-0">
              <p className="text-sm font-medium text-ink break-words">{event.message}</p>
              <p className="text-2xs text-ink-dim mt-1 font-mono">
                {event.area} · {new Date(event.created_at).toLocaleString("pt-BR")}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="text-ink-muted hover:text-ink p-1">
            <X className="size-4" />
          </button>
        </div>

        <div className="p-5 space-y-4 text-xs">
          {event.user_email && (
            <Section label="Usuário"><span className="font-mono">{event.user_email}</span></Section>
          )}
          {Object.keys(event.tags).length > 0 && (
            <Section label="Tags">
              <div className="flex flex-wrap gap-1.5">
                {Object.entries(event.tags).map(([k, v]) => (
                  <Badge key={k} tone="neutral" size="xs">{k}={v}</Badge>
                ))}
              </div>
            </Section>
          )}
          {Object.keys(event.extra).length > 0 && (
            <Section label="Extra">
              <pre className="bg-bg-inset rounded-md p-3 text-2xs font-mono overflow-x-auto whitespace-pre-wrap break-words">
                {JSON.stringify(event.extra, null, 2)}
              </pre>
            </Section>
          )}
          {event.stack && (
            <Section label="Stack trace">
              <pre className="bg-bg-inset rounded-md p-3 text-2xs font-mono overflow-x-auto whitespace-pre-wrap break-words text-ink-muted leading-relaxed">
                {event.stack}
              </pre>
            </Section>
          )}
        </div>
      </div>
    </>
  );
}

function Section({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="eyebrow text-ink-dim mb-1.5">{label}</p>
      {children}
    </div>
  );
}

// ============================================================
function HealthTab() {
  const { data, isLoading } = useSWR<any>("/api/admin/summary", fetcher, { refreshInterval: 30_000 });
  if (isLoading || !data) return <div className="h-40 bg-bg-elevated/40 rounded-xl animate-pulse" />;

  return (
    <div className="space-y-5">
      <section className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Erros 24h" value={data.errors_24h} tone={data.errors_24h > 0 ? "negative" : "positive"} />
        <Stat label="Warnings 24h" value={data.warnings_24h} tone={data.warnings_24h > 0 ? "warning" : "neutral"} />
        <Stat label="Webhooks 24h" value={data.webhooks_24h} tone="info" />
        <Stat label="Tokens inválidos" value={data.invalid_tokens} tone={data.invalid_tokens > 0 ? "warning" : "positive"} hint={`${data.active_tokens} ativos`} />
      </section>

      <section className="grid md:grid-cols-2 gap-4">
        <Panel title="Erros por área (24h)">
          {Object.keys(data.errors_by_area).length === 0 ? (
            <p className="text-2xs text-ink-muted">Nenhum erro 🎉</p>
          ) : (
            <ul className="space-y-1">
              {Object.entries(data.errors_by_area as Record<string, number>)
                .sort((a, b) => b[1] - a[1])
                .map(([area, count]) => (
                  <li key={area} className="flex justify-between text-xs">
                    <span className="font-mono text-ink">{area}</span>
                    <span className="text-negative font-medium">{count}</span>
                  </li>
                ))}
            </ul>
          )}
        </Panel>

        <Panel title="Webhooks por gateway (7d)">
          {Object.keys(data.webhooks_by_gateway_7d).length === 0 ? (
            <p className="text-2xs text-ink-muted">Sem webhooks recebidos.</p>
          ) : (
            <ul className="space-y-1">
              {Object.entries(data.webhooks_by_gateway_7d as Record<string, number>)
                .sort((a, b) => b[1] - a[1])
                .map(([gw, count]) => (
                  <li key={gw} className="flex justify-between text-xs">
                    <span className="capitalize text-ink">{gw}</span>
                    <span className="text-positive font-medium">{count}</span>
                  </li>
                ))}
            </ul>
          )}
        </Panel>
      </section>
    </div>
  );
}

// ============================================================
function UsersTab() {
  const [query, setQuery] = React.useState("");
  const { data, isLoading } = useSWR<any>("/api/admin/users", fetcher);
  if (isLoading || !data) return <div className="h-40 bg-bg-elevated/40 rounded-xl animate-pulse" />;

  const filtered = (data.users as any[]).filter((u) =>
    !query || u.email?.toLowerCase().includes(query.toLowerCase()) || u.name?.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-4">
      <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
        <Stat label="Total usuários" value={data.total} />
        <Stat label="Confirmados" value={data.confirmed} tone="positive" />
        <Stat label="Signups 7 dias" value={data.last_7d_signups} tone="info" />
      </section>

      <div className="relative max-w-sm">
        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-ink-dim" />
        <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por email ou nome…" className="pl-8 h-8" />
      </div>

      <div className="rounded-xl border border-line bg-bg-surface overflow-hidden">
        <table className="w-full text-xs">
          <thead className="bg-bg-inset/40 border-b border-line">
            <tr className="text-2xs uppercase tracking-wider text-ink-dim">
              <th className="text-left px-4 py-2.5 font-semibold">Email</th>
              <th className="text-left px-4 py-2.5 font-semibold">Nome</th>
              <th className="text-right px-4 py-2.5 font-semibold">Contas</th>
              <th className="text-right px-4 py-2.5 font-semibold">Projetos</th>
              <th className="text-right px-4 py-2.5 font-semibold">Erros</th>
              <th className="text-right px-4 py-2.5 font-semibold">Último login</th>
              <th className="text-right px-4 py-2.5 font-semibold">Cadastro</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-b border-line/60 hover:bg-bg-inset/40">
                <td className="px-4 py-2.5 font-mono text-ink truncate">{u.email}</td>
                <td className="px-4 py-2.5 text-ink-muted">{u.name ?? "—"}</td>
                <td className="px-4 py-2.5 text-right num">{u.ad_accounts}</td>
                <td className="px-4 py-2.5 text-right num">{u.utm_projects}</td>
                <td className={cn("px-4 py-2.5 text-right num", u.errors_count > 0 && "text-negative font-medium")}>
                  {u.errors_count}
                </td>
                <td className="px-4 py-2.5 text-right text-2xs text-ink-muted">
                  {u.last_sign_in_at ? timeAgo(u.last_sign_in_at) : "—"}
                </td>
                <td className="px-4 py-2.5 text-right text-2xs text-ink-muted">
                  {u.created_at ? new Date(u.created_at).toLocaleDateString("pt-BR") : "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// ============================================================
function DbTab() {
  const { data, isLoading } = useSWR<any>("/api/admin/db-stats", fetcher);
  if (isLoading || !data) return <div className="h-40 bg-bg-elevated/40 rounded-xl animate-pulse" />;

  const matchRate = data.semantic.total_match_rate;

  return (
    <div className="space-y-5">
      {matchRate != null && (
        <section className="grid grid-cols-2 md:grid-cols-3 gap-3">
          <Stat
            label="Match rate global"
            value={`${(matchRate * 100).toFixed(1)}%`}
            tone={matchRate >= 0.8 ? "positive" : matchRate >= 0.6 ? "warning" : "negative"}
            hint={`${data.semantic.total_matched} de ${data.semantic.total_attributions}`}
          />
        </section>
      )}

      <Panel title="Linhas por tabela">
        <table className="w-full text-xs">
          <tbody>
            {(data.tables as any[]).map((t) => (
              <tr key={t.table} className="border-b border-line/40 last:border-0">
                <td className="py-1.5 font-mono text-ink-muted">{t.table}</td>
                <td className="py-1.5 text-right num font-medium text-ink">
                  {t.error ? <span className="text-negative">err</span> : t.count.toLocaleString("pt-BR")}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Panel>
    </div>
  );
}

// ============================================================
function Stat({
  label, value, hint, tone = "neutral",
}: { label: string; value: string | number; hint?: string; tone?: "neutral" | "positive" | "negative" | "warning" | "info" }) {
  const cls =
    tone === "positive" ? "text-positive" :
    tone === "negative" ? "text-negative" :
    tone === "warning" ? "text-warning" :
    tone === "info" ? "text-info" :
    "text-ink";
  return (
    <div className="rounded-xl border border-line bg-bg-surface p-4">
      <p className="text-2xs uppercase tracking-wider text-ink-dim font-medium">{label}</p>
      <p className={cn("font-display text-2xl font-bold tabular-nums mt-1", cls)}>{value}</p>
      {hint && <p className="text-2xs text-ink-muted mt-0.5">{hint}</p>}
    </div>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-line bg-bg-surface p-4">
      <p className="text-xs font-semibold text-ink mb-3">{title}</p>
      {children}
    </div>
  );
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const s = Math.floor(diff / 1000);
  if (s < 60) return `${s}s atrás`;
  const m = Math.floor(s / 60);
  if (m < 60) return `${m}min atrás`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h atrás`;
  const d = Math.floor(h / 24);
  return `${d}d atrás`;
}
