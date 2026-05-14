/**
 * POST /api/cron/rules
 *
 * Avalia todas as regras ativas com next_run_at <= now() e dispara as ações
 * que casarem. Pode ser chamado por:
 *  - Vercel Cron (vercel.json com schedule "* * * * *")
 *  - Botão "Verificar agora" do /regras (passa user_id e force=true)
 *  - curl manual em dev
 *
 * Body: { force?: boolean, rule_id?: string }
 *  - force=true ignora next_run_at (dispara mesmo se ainda não chegou hora)
 *  - rule_id limita execução a uma regra específica
 *
 * Auth: bearer token (CRON_SECRET) OU sessão de user logado (pra botão manual).
 *  - Se chamado com Bearer: roda pra TODOS os users
 *  - Se chamado com cookie: roda só pras regras do user logado
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { graphGet, graphPost, GraphError, isInvalidTokenError } from "@/lib/meta/graph-client";
import { captureError } from "@/lib/sentry";
import { decryptCredentials } from "@/lib/meta/conn-credentials";
import {
  expandMetrics,
  evalCondition,
  periodToDatePreset,
  nextRunAt,
  nameMatches,
  parseScope,
  type InsightRow,
} from "@/lib/automation/eval";

export const runtime = "nodejs";
export const maxDuration = 60; // permite até 60s de execução

interface Rule {
  id: string;
  user_id: string;
  name: string;
  accounts_filter: string[];
  scope: string;
  name_filter_op: string;
  name_filter_text: string;
  action: string;
  action_value: number | null;
  action_unit: string;
  conditions: { metric: string; op: string; value: number }[];
  period: string;
  frequency: string;
  daily_limit: number | null;
  status: string;
  triggers_count: number;
}

interface MetaItem {
  id: string;
  name: string;
  status: string;
  effective_status?: string;
  daily_budget?: string;
  lifetime_budget?: string;
}

export async function POST(req: NextRequest) {
  const auth = req.headers.get("authorization") || "";
  const cronSecret = process.env.CRON_SECRET;
  const isCron = cronSecret && auth === `Bearer ${cronSecret}`;

  // Pra botão manual, valida sessão
  let scopedUserId: string | null = null;
  if (!isCron) {
    const userSupabase = await createClient();
    const { data: { user } } = await userSupabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
    scopedUserId = user.id;
  }

  const body = await req.json().catch(() => ({}));
  const force = !!body.force;
  const onlyRuleId = typeof body.rule_id === "string" ? body.rule_id : null;

  // Cron com Bearer → admin (bypass RLS, lê regras de todos os users)
  // Botão manual com cookie → anon (RLS filtra por user logado)
  const supabase = isCron ? createAdminClient() : await createClient();

  let q = supabase
    .from("rules")
    .select("*")
    .eq("status", "active");
  if (scopedUserId) q = q.eq("user_id", scopedUserId);
  if (onlyRuleId) q = q.eq("id", onlyRuleId);
  if (!force) {
    // next_run_at é null OR <= now()
    q = q.or(`next_run_at.is.null,next_run_at.lte.${new Date().toISOString()}`);
  }

  const { data: rules, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  if (!rules || rules.length === 0) {
    return NextResponse.json({ ok: true, evaluated: 0, triggered: 0, executions: [] });
  }

  const allExecutions: any[] = [];
  let totalTriggered = 0;

  for (const rule of rules as Rule[]) {
    try {
      // Daily limit — não executa se já bateu o limite hoje
      if (rule.daily_limit) {
        const todayStart = new Date();
        todayStart.setHours(0, 0, 0, 0);

        const { count: todayCount } = await supabase
          .from("rule_executions")
          .select("*", { count: "exact", head: true })
          .eq("rule_id", rule.id)
          .gte("executed_at", todayStart.toISOString())
          .eq("status", "success");

        if (todayCount != null && todayCount >= rule.daily_limit) {
          allExecutions.push({
            rule_id: rule.id,
            rule_name: rule.name,
            status: "skipped",
            reason: `Limite diário atingido (${todayCount}/${rule.daily_limit})`,
          });
          // Atualiza next_run_at pra amanhã 00:01
          const tomorrow = new Date(todayStart);
          tomorrow.setDate(tomorrow.getDate() + 1);
          tomorrow.setMinutes(1);
          await supabase
            .from("rules")
            .update({
              last_run_at: new Date().toISOString(),
              next_run_at: tomorrow.toISOString(),
            })
            .eq("id", rule.id);
          continue;
        }
      }

      const result = await evaluateRule(supabase, rule);
      allExecutions.push(...result.executions);
      totalTriggered += result.triggeredCount;

      // Atualiza a regra: last_run_at + next_run_at + triggers_count
      const nra = nextRunAt(rule.frequency);
      await supabase
        .from("rules")
        .update({
          last_run_at: new Date().toISOString(),
          next_run_at: nra.toISOString(),
          triggers_count: rule.triggers_count + result.triggeredCount,
        })
        .eq("id", rule.id);
    } catch (e: any) {
      allExecutions.push({
        rule_id: rule.id,
        rule_name: rule.name,
        status: "failed",
        error: e.message,
      });
    }
  }

  return NextResponse.json({
    ok: true,
    evaluated: rules.length,
    triggered: totalTriggered,
    executions: allExecutions,
  });
}

// =============================================================
// Avalia uma regra contra todas as ad_accounts no escopo
// =============================================================
async function evaluateRule(supabase: any, rule: Rule) {
  const { kind, activeOnly } = parseScope(rule.scope);
  const datePreset = periodToDatePreset(rule.period);

  const executions: any[] = [];
  let triggeredCount = 0;

  // Lista contas no escopo (vazio = todas as contas do user)
  let accQuery = supabase
    .from("ad_accounts")
    .select("id, account_id, meta_connections!inner(access_token_ciphertext, app_secret_ciphertext, status)")
    .eq("user_id", rule.user_id);

  if (rule.accounts_filter && rule.accounts_filter.length > 0) {
    accQuery = accQuery.in("account_id", rule.accounts_filter);
  }
  const { data: accounts } = await accQuery;
  if (!accounts || accounts.length === 0) return { executions, triggeredCount };

  for (const acc of accounts) {
    const conn = (acc as any).meta_connections;
    if (conn.status !== "active") continue;
    const { token, appSecret } = decryptCredentials(conn);

    try {
      // Busca itens (campanhas/conjuntos/anúncios) + insights em paralelo
      const itemsPath = kind === "campaign" ? "campaigns" : kind === "adset" ? "adsets" : "ads";
      const idField = kind === "campaign" ? "campaign_id" : kind === "adset" ? "adset_id" : "ad_id";

      const [itemsRes, insightsRes] = await Promise.all([
        graphGet<{ data: MetaItem[] }>(
          token,
          `/${acc.account_id}/${itemsPath}`,
          {
            fields: "id,name,status,effective_status,daily_budget,lifetime_budget",
            limit: 500,
          },
          appSecret
        ),
        graphGet<{ data: (InsightRow & { [key: string]: any })[] }>(
          token,
          `/${acc.account_id}/insights`,
          {
            level: kind,
            date_preset: datePreset,
            fields: `${idField},spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,action_values`,
            limit: 500,
          },
          appSecret
        ).catch(() => ({ data: [] as any[] })),
      ]);

      // Index insights por id
      const insightsByItem = new Map<string, InsightRow>();
      for (const ins of insightsRes.data) {
        const id = ins[idField];
        if (id) insightsByItem.set(id, ins);
      }

      for (const item of itemsRes.data) {
        // Filtra por status
        if (activeOnly && item.status !== "ACTIVE") continue;
        if (!activeOnly && rule.scope.toLowerCase().includes("pausad") && item.status !== "PAUSED") continue;

        // Filtra por nome
        if (!nameMatches(item.name, rule.name_filter_op, rule.name_filter_text)) continue;

        // Calcula métricas
        const ins = insightsByItem.get(item.id);
        const dailyBudget = parseFloat(item.daily_budget ?? "0") / 100;
        const metrics = expandMetrics(ins, dailyBudget);

        // Avalia todas as conditions (AND)
        const allMatch = rule.conditions.every((c) => {
          const value = metrics[c.metric];
          if (value === undefined || isNaN(value)) return false;
          return evalCondition(value, c.op, c.value);
        });

        if (!allMatch) continue;

        // Match — executa ação
        const exec = await executeAction(token, appSecret, kind, item, rule, metrics);
        executions.push({
          rule_id: rule.id,
          rule_name: rule.name,
          target_type: kind,
          target_id: item.id,
          target_name: item.name,
          status: exec.status,
          error: exec.error,
          metrics_snapshot: metrics,
        });

        // Persiste em rule_executions
        await supabase.from("rule_executions").insert({
          rule_id: rule.id,
          user_id: rule.user_id,
          target_type: kind,
          target_id: item.id,
          target_name: item.name,
          before_json: { status: item.status, daily_budget: item.daily_budget ?? null },
          after_json: exec.afterJson ?? null,
          status: exec.status,
          error_message: exec.error ?? null,
        });

        if (exec.status === "success") triggeredCount++;
      }
    } catch (err: any) {
      if (isInvalidTokenError(err)) {
        await supabase.from("meta_connections").update({ status: "invalid" }).eq("id", conn.id ?? "");
      }
      captureError(err, {
        area: "cron-rules",
        userId: rule.user_id,
        tags: { rule_id: rule.id, account: acc.account_id },
      });
      executions.push({
        rule_id: rule.id,
        rule_name: rule.name,
        target_id: acc.account_id,
        status: "failed",
        error: err.message ?? String(err),
      });
    }
  }

  return { executions, triggeredCount };
}

// =============================================================
// Executa a ação da regra contra um item (campanha/conjunto/anúncio)
// =============================================================
async function executeAction(
  token: string,
  appSecret: string | null,
  kind: "campaign" | "adset" | "ad",
  item: MetaItem,
  rule: Rule,
  _metrics: Record<string, number>
): Promise<{ status: "success" | "failed" | "skipped"; error?: string; afterJson?: any }> {
  try {
    if (rule.action === "pause") {
      await graphPost(token, `/${item.id}`, { status: "PAUSED" }, appSecret);
      return { status: "success", afterJson: { status: "PAUSED" } };
    }
    if (rule.action === "activate") {
      await graphPost(token, `/${item.id}`, { status: "ACTIVE" }, appSecret);
      return { status: "success", afterJson: { status: "ACTIVE" } };
    }

    // Budget actions só fazem sentido pra campaign (CBO) ou adset
    if (kind === "ad") {
      return { status: "skipped", error: "Budget actions não se aplicam a anúncios" };
    }

    const currentBudgetCents = parseInt(item.daily_budget ?? "0") || 0;
    if (currentBudgetCents === 0) {
      // CBO em campanha sem budget próprio (ABO) ou adset sem daily_budget
      return { status: "skipped", error: "Item sem orçamento próprio" };
    }

    let newBudgetCents = currentBudgetCents;

    if (rule.action === "increase_budget" || rule.action === "decrease_budget") {
      const dir = rule.action === "increase_budget" ? 1 : -1;
      const value = rule.action_value ?? 0;
      if (rule.action_unit === "pct") {
        newBudgetCents = Math.round(currentBudgetCents * (1 + (dir * value) / 100));
      } else {
        // unit "abs" — value em BRL → cents
        newBudgetCents = Math.round(currentBudgetCents + dir * value * 100);
      }
    } else if (rule.action === "set_budget") {
      const value = rule.action_value ?? 0;
      newBudgetCents = Math.round(value * 100);
    } else {
      return { status: "skipped", error: `Ação desconhecida: ${rule.action}` };
    }

    if (newBudgetCents <= 0) {
      return { status: "skipped", error: "Orçamento calculado <= 0" };
    }

    await graphPost(token, `/${item.id}`, { daily_budget: newBudgetCents }, appSecret);
    return {
      status: "success",
      afterJson: {
        daily_budget: newBudgetCents,
        previous_daily_budget: currentBudgetCents,
      },
    };
  } catch (err) {
    if (err instanceof GraphError) {
      return { status: "failed", error: `${err.code}: ${err.message}` };
    }
    return { status: "failed", error: (err as Error).message };
  }
}
