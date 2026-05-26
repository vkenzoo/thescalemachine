/**
 * GET /api/meta/campaigns?account=act_123&period=last_30_days
 *
 * Estratégia híbrida:
 * 1. Busca campanhas da Graph API (estrutura)
 * 2. Busca insights agregados pelo período (métricas)
 * 3. Faz o merge no servidor e retorna pra UI
 * 4. Em paralelo, faz upsert no DB local (cache)
 *
 * Em request seguinte (mesma janela), pode retornar do DB sem bater na Meta.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphGet } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";

export const runtime = "nodejs";

interface MetaCampaign {
  id: string;
  name: string;
  status: string;
  objective: string;
  daily_budget?: string;
  lifetime_budget?: string;
  buying_type?: string;
  bid_strategy?: string;
  created_time?: string;
  updated_time?: string;
}

interface MetaInsight {
  campaign_id: string;
  spend?: string;
  impressions?: string;
  reach?: string;
  clicks?: string;
  ctr?: string;
  cpc?: string;
  cpm?: string;
  frequency?: string;
  actions?: { action_type: string; value: string }[];
  action_values?: { action_type: string; value: string }[];
}

const PERIOD_MAP: Record<string, string> = {
  today: "today",
  yesterday: "yesterday",
  last_7d: "last_7d",
  last_30d: "last_30d",
  this_month: "this_month",
  last_month: "last_month",
  maximum: "maximum",
};

/**
 * Pra cada period, calcula o time_range do período ANTERIOR equivalente
 * (mesma duração, deslocada pra trás). Retorna { since, until } em YYYY-MM-DD.
 */
function previousRange(period: string): { since: string; until: string } {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const day = (d: Date, days: number) => {
    const out = new Date(d);
    out.setDate(out.getDate() + days);
    return out;
  };

  if (period === "today") {
    const y = day(today, -1);
    return { since: fmt(y), until: fmt(y) };
  }
  if (period === "yesterday") {
    const y = day(today, -2);
    return { since: fmt(y), until: fmt(y) };
  }
  if (period === "last_7d") {
    return { since: fmt(day(today, -14)), until: fmt(day(today, -8)) };
  }
  if (period === "last_30d") {
    return { since: fmt(day(today, -60)), until: fmt(day(today, -31)) };
  }
  if (period === "this_month") {
    const lastMonthEnd = new Date(today.getFullYear(), today.getMonth(), 0);
    const lastMonthStart = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    return { since: fmt(lastMonthStart), until: fmt(lastMonthEnd) };
  }
  if (period === "last_month") {
    const start = new Date(today.getFullYear(), today.getMonth() - 2, 1);
    const end = new Date(today.getFullYear(), today.getMonth() - 1, 0);
    return { since: fmt(start), until: fmt(end) };
  }
  // maximum: usa últimos 365d como "anterior"
  return { since: fmt(day(today, -730)), until: fmt(day(today, -366)) };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const accountParam = url.searchParams.get("account");
  const period = PERIOD_MAP[url.searchParams.get("period") ?? "last_30d"] ?? "last_30d";
  const usePrevious = url.searchParams.get("previous") === "1";

  if (!accountParam) {
    return NextResponse.json({ error: "missing_account" }, { status: 400 });
  }

  // Resolve a ad_account → connection → token
  const { data: adAccount, error: accErr } = await supabase
    .from("ad_accounts")
    .select("id, account_id, connection_id, meta_connections!inner(access_token_ciphertext, app_secret_ciphertext, status)")
    .eq("account_id", accountParam)
    .eq("user_id", user.id)
    .single();

  if (accErr || !adAccount) {
    return NextResponse.json({ error: "account_not_found" }, { status: 404 });
  }

  const conn = (adAccount as any).meta_connections;
  if (conn.status !== "active") {
    return NextResponse.json({ error: "connection_invalid", status: conn.status }, { status: 400 });
  }

  const { token, appSecret } = decryptCredentials(conn);

  try {
    // Busca estrutura + insights em paralelo
    const [structRes, insightsRes] = await Promise.all([
      graphGet<{ data: MetaCampaign[] }>(token, `/${adAccount.account_id}/campaigns`, {
        fields: "id,name,status,objective,daily_budget,lifetime_budget,buying_type,bid_strategy,created_time,updated_time",
        limit: 500,
      }, appSecret),
      graphGet<{ data: MetaInsight[] }>(token, `/${adAccount.account_id}/insights`, usePrevious ? {
        level: "campaign",
        time_range: JSON.stringify(previousRange(period)),
        fields: "campaign_id,spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,action_values",
        limit: 500,
      } : {
        level: "campaign",
        date_preset: period,
        fields: "campaign_id,spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,action_values",
        limit: 500,
      }, appSecret).catch(() => ({ data: [] as MetaInsight[] })),
    ]);

    // Index insights por campaign_id
    const insightsMap = new Map<string, MetaInsight>();
    for (const i of insightsRes.data) insightsMap.set(i.campaign_id, i);

    // Merge
    const campaigns = structRes.data.map((c) => {
      const ins = insightsMap.get(c.id);
      const purchases = parseAction(ins?.actions, ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"]);
      const revenue = parseAction(ins?.action_values, ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"]);
      const leads = parseAction(ins?.actions, ["lead", "offsite_conversion.fb_pixel_lead"]);
      const messages = parseAction(ins?.actions, ["onsite_conversion.messaging_first_reply", "onsite_conversion.total_messaging_connection"]);
      const igVisits = parseAction(ins?.actions, ["onsite_conversion.ig_profile_visit", "ig_profile_visit"]);
      const cartAdds = parseAction(ins?.actions, ["add_to_cart", "offsite_conversion.fb_pixel_add_to_cart"]);
      const checkouts = parseAction(ins?.actions, ["initiate_checkout", "offsite_conversion.fb_pixel_initiate_checkout"]);

      const spend = parseFloat(ins?.spend ?? "0");
      const impressions = parseInt(ins?.impressions ?? "0");
      const clicks = parseInt(ins?.clicks ?? "0");

      const hasCampaignBudget = !!(c.daily_budget || c.lifetime_budget);
      return {
        id: c.id,
        name: c.name,
        status: c.status,
        objective: c.objective,
        // CBO: budget vive na campanha. ABO: budget vive nos conjuntos.
        budgetType: hasCampaignBudget ? "CBO" : "ABO",
        dailyBudget: parseFloat(c.daily_budget ?? "0") / 100,
        lifetimeBudget: parseFloat(c.lifetime_budget ?? "0") / 100,
        spend,
        impressions,
        reach: parseInt(ins?.reach ?? "0"),
        clicks,
        ctr: parseFloat(ins?.ctr ?? "0") / 100,
        cpc: parseFloat(ins?.cpc ?? "0"),
        cpm: parseFloat(ins?.cpm ?? "0"),
        frequency: parseFloat(ins?.frequency ?? "0"),
        purchases,
        cpa: purchases > 0 ? spend / purchases : 0,
        revenue,
        roas: spend > 0 ? revenue / spend : 0,
        leads,
        cpl: leads > 0 ? spend / leads : 0,
        messages,
        cpMessage: messages > 0 ? spend / messages : 0,
        igVisits,
        cpIg: igVisits > 0 ? spend / igVisits : 0,
        cartAdds,
        cpCart: cartAdds > 0 ? spend / cartAdds : 0,
        checkouts,
        cpCheckout: checkouts > 0 ? spend / checkouts : 0,
        whatsapp: 0,
        cpWhats: 0,
      };
    });

    return NextResponse.json({
      campaigns,
      account_id: adAccount.account_id,
      period,
      cached: false,
    });
  } catch (err: any) {
    console.error("[/api/meta/campaigns] graph_error:", err?.message, err?.code, err?.raw);
    return NextResponse.json(
      {
        error: "graph_error",
        message: err.message ?? "Erro desconhecido na Graph API",
        code: err.code ?? null,
        detail: err.raw?.error_user_msg ?? err.raw?.message ?? null,
      },
      { status: 500 }
    );
  }
}

/**
 * Pega o valor da PRIMEIRA action_type da lista que existir.
 *
 * IMPORTANTE: tipos como `purchase` e `omni_purchase` se sobrepõem
 * (`omni_purchase` = total deduplicado web+app+offline; é o que o Meta
 * Ads Manager mostra como "Compras" / "Valor de conversões em compras").
 * Somar todos resulta em contagem duplicada — preferimos o mais agregado
 * disponível e ignoramos os outros.
 *
 * Ordem dos `types` deve ser: mais agregado primeiro, fallbacks depois.
 */
function parseAction(actions: { action_type: string; value: string }[] | undefined, types: string[]): number {
  if (!actions) return 0;
  for (const t of types) {
    const a = actions.find((x) => x.action_type === t);
    if (a) return parseFloat(a.value || "0");
  }
  return 0;
}
