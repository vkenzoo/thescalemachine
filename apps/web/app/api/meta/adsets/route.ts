/**
 * GET /api/meta/adsets?account=act_X&period=last_30d&campaign=ID
 *
 * Lista adsets da conta com insights agregados pelo período.
 * - account: obrigatório
 * - period: opcional (default last_30d)
 * - campaign: opcional, filtra por campaign_id (Graph não suporta filter direto,
 *   filtramos no servidor — adsets retornados já trazem campaign_id)
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphGet } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";

export const runtime = "nodejs";

interface MetaAdset {
  id: string;
  name: string;
  status: string;
  campaign_id: string;
  daily_budget?: string;
  lifetime_budget?: string;
  bid_strategy?: string;
  optimization_goal?: string;
  billing_event?: string;
  start_time?: string;
  end_time?: string;
  targeting?: any;
}

interface MetaInsight {
  adset_id: string;
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

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const accountParam = url.searchParams.get("account");
  const period = PERIOD_MAP[url.searchParams.get("period") ?? "last_30d"] ?? "last_30d";
  const campaignFilter = url.searchParams.get("campaign");

  if (!accountParam) {
    return NextResponse.json({ error: "missing_account" }, { status: 400 });
  }

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
    const [structRes, insightsRes, campaignsRes] = await Promise.all([
      graphGet<{ data: MetaAdset[] }>(token, `/${adAccount.account_id}/adsets`, {
        fields: "id,name,status,campaign_id,daily_budget,lifetime_budget,bid_strategy,optimization_goal,billing_event,start_time,end_time,targeting",
        limit: 500,
      }, appSecret),
      graphGet<{ data: MetaInsight[] }>(token, `/${adAccount.account_id}/insights`, {
        level: "adset",
        date_preset: period,
        fields: "adset_id,spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,action_values",
        limit: 500,
      }, appSecret).catch(() => ({ data: [] as MetaInsight[] })),
      graphGet<{ data: { id: string; name: string }[] }>(token, `/${adAccount.account_id}/campaigns`, {
        fields: "id,name",
        limit: 500,
      }, appSecret).catch(() => ({ data: [] })),
    ]);

    const insightsMap = new Map<string, MetaInsight>();
    for (const i of insightsRes.data) insightsMap.set(i.adset_id, i);

    const campaignNameMap = new Map<string, string>();
    for (const c of campaignsRes.data) campaignNameMap.set(c.id, c.name);

    const filtered = campaignFilter
      ? structRes.data.filter((a) => a.campaign_id === campaignFilter)
      : structRes.data;

    const adsets = filtered.map((a) => {
      const ins = insightsMap.get(a.id);
      const purchases = parseAction(ins?.actions, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]);
      const revenue = parseAction(ins?.action_values, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]);
      const leads = parseAction(ins?.actions, ["lead", "offsite_conversion.fb_pixel_lead"]);
      const messages = parseAction(ins?.actions, ["onsite_conversion.messaging_first_reply", "onsite_conversion.total_messaging_connection"]);

      const spend = parseFloat(ins?.spend ?? "0");
      const impressions = parseInt(ins?.impressions ?? "0");
      const clicks = parseInt(ins?.clicks ?? "0");

      const targeting = a.targeting ?? {};
      const ageMin = targeting.age_min;
      const ageMax = targeting.age_max;
      const genders = targeting.genders;  // [1] = male, [2] = female, undefined = both
      const geoLocations = targeting.geo_locations?.countries ?? [];
      const targetingSummary = [
        geoLocations.length > 0 ? geoLocations.join(",") : "—",
        ageMin && ageMax ? `${ageMin}-${ageMax}` : "todas idades",
        genders ? (genders[0] === 1 ? "homens" : "mulheres") : "todos",
      ].join(" · ");

      return {
        id: a.id,
        name: a.name,
        status: a.status,
        campaignId: a.campaign_id,
        campaignName: campaignNameMap.get(a.campaign_id) ?? "—",
        dailyBudget: parseFloat(a.daily_budget ?? "0") / 100,
        lifetimeBudget: parseFloat(a.lifetime_budget ?? "0") / 100,
        optimizationGoal: a.optimization_goal,
        billingEvent: a.billing_event,
        targetingSummary,
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
      };
    });

    return NextResponse.json({ adsets, account_id: adAccount.account_id, period });
  } catch (err: any) {
    return NextResponse.json(
      { error: "graph_error", message: err.message, code: err.code },
      { status: 500 }
    );
  }
}

function parseAction(
  actions: { action_type: string; value: string }[] | undefined,
  types: string[]
): number {
  if (!actions) return 0;
  let total = 0;
  for (const a of actions) {
    if (types.includes(a.action_type)) total += parseFloat(a.value || "0");
  }
  return total;
}
