/**
 * POST /api/cron/alerts
 *
 * Avalia todos os alertas habilitados. Diferente das regras, não executa ação —
 * só cria alert_event + notification (sino).
 *
 * Mesmo padrão de auth: Bearer CRON_SECRET (todos os users) ou cookie (só logado).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { graphGet, isInvalidTokenError } from "@/lib/meta/graph-client";
import { captureError } from "@/lib/sentry";
import { decryptCredentials } from "@/lib/meta/conn-credentials";
import {
  expandMetrics,
  evalCondition,
  type InsightRow,
} from "@/lib/automation/eval";

export const runtime = "nodejs";
export const maxDuration = 60;

interface Alert {
  id: string;
  user_id: string;
  name: string;
  metric: string;
  op: string;
  value: number;
  account_filter: string;
  enabled: boolean;
  triggers_count: number;
}

const METRIC_LABELS: Record<string, string> = {
  cpa: "CPA",
  cpc: "CPC",
  cpm: "CPM",
  ctr: "CTR",
  spend: "Gasto",
  roas: "ROAS",
};

const OP_LABELS: Record<string, string> = {
  gt: "passou de",
  lt: "ficou abaixo de",
  gte: "atingiu",
  lte: "caiu até",
  eq: "ficou igual a",
};

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && auth === `Bearer ${cronSecret}`;

  let scopedUserId: string | null = null;
  if (!isCron) {
    const userSupabase = await createClient();
    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    scopedUserId = user.id;
  }

  // Cron com Bearer → admin (bypass RLS); botão manual → anon (RLS por user)
  const supabase = isCron ? createAdminClient() : await createClient();

  let q = supabase.from("alerts").select("*").eq("enabled", true);
  if (scopedUserId) q = q.eq("user_id", scopedUserId);

  const { data: alerts, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!alerts || alerts.length === 0) {
    return NextResponse.json({ ok: true, evaluated: 0, triggered: 0 });
  }

  let totalTriggered = 0;
  const events: any[] = [];

  for (const alert of alerts as Alert[]) {
    try {
      const result = await evaluateAlert(supabase, alert);
      events.push(...result.events);
      totalTriggered += result.triggeredCount;

      await supabase
        .from("alerts")
        .update({
          last_check_at: new Date().toISOString(),
          ...(result.triggeredCount > 0
            ? {
                last_triggered_at: new Date().toISOString(),
                triggers_count: alert.triggers_count + result.triggeredCount,
              }
            : {}),
        })
        .eq("id", alert.id);
    } catch (e: any) {
      events.push({ alert_id: alert.id, status: "failed", error: e.message });
    }
  }

  return NextResponse.json({
    ok: true,
    evaluated: alerts.length,
    triggered: totalTriggered,
    events,
  });
}

async function evaluateAlert(supabase: any, alert: Alert) {
  const events: any[] = [];
  let triggeredCount = 0;

  // Lista contas no escopo
  let accQuery = supabase
    .from("ad_accounts")
    .select("id, account_id, name, meta_connections!inner(access_token_ciphertext, app_secret_ciphertext, status)")
    .eq("user_id", alert.user_id);

  if (alert.account_filter !== "all") {
    accQuery = accQuery.eq("account_id", alert.account_filter);
  }
  const { data: accounts } = await accQuery;
  if (!accounts || accounts.length === 0) return { events, triggeredCount };

  for (const acc of accounts) {
    const conn = (acc as any).meta_connections;
    if (conn.status !== "active") continue;
    const { token, appSecret } = decryptCredentials(conn);

    try {
      // Pra alertas usamos sempre last_7d como janela default
      const insightsRes = await graphGet<{ data: InsightRow[] }>(
        token,
        `/${acc.account_id}/insights`,
        {
          level: "account",
          date_preset: "last_7d",
          fields: "spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,action_values",
        },
        appSecret
      );

      const ins = insightsRes.data?.[0];
      const metrics = expandMetrics(ins);
      const value = metrics[alert.metric];
      if (value === undefined || isNaN(value)) continue;

      const matches = evalCondition(value, alert.op, alert.value);
      if (!matches) continue;

      // Dispara: cria alert_event + notification
      const accName = (acc as any).name as string;
      await supabase.from("alert_events").insert({
        alert_id: alert.id,
        user_id: alert.user_id,
        value_at_trigger: value,
        account_id: acc.account_id,
        notified_via: ["in_app"],
      });

      const metricLabel = METRIC_LABELS[alert.metric] ?? alert.metric;
      const opLabel = OP_LABELS[alert.op] ?? alert.op;
      const formatted = formatMetricValue(alert.metric, value);

      await supabase.from("notifications").insert({
        user_id: alert.user_id,
        tone: "warning",
        title: `${metricLabel} ${opLabel} ${alert.value}`,
        description: `${accName}: agora está em ${formatted}`,
        link: `/alerts`,
      });

      events.push({
        alert_id: alert.id,
        account_id: acc.account_id,
        value_at_trigger: value,
        status: "triggered",
      });
      triggeredCount++;
    } catch (err: any) {
      if (isInvalidTokenError(err)) {
        await supabase.from("meta_connections").update({ status: "invalid" }).eq("id", conn.id ?? "");
      }
      captureError(err, {
        area: "cron-alerts",
        userId: alert.user_id,
        tags: { alert_id: alert.id, account: acc.account_id },
      });
      events.push({ alert_id: alert.id, account_id: acc.account_id, status: "failed", error: err.message });
    }
  }

  return { events, triggeredCount };
}

function formatMetricValue(metric: string, value: number): string {
  if (metric === "ctr") return (value * 100).toFixed(2) + "%";
  if (metric === "roas") return value.toFixed(2) + "×";
  if (metric === "cpa" || metric === "cpc" || metric === "cpm" || metric === "spend") {
    return `R$ ${value.toFixed(2).replace(".", ",")}`;
  }
  return String(value);
}
