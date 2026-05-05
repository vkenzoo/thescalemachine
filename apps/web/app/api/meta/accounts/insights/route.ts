/**
 * GET /api/meta/accounts/insights?period=last_30d
 *
 * Para cada ad_account conectada do user, busca insights agregados
 * (level=account) na Graph API. Usado pela Central de Contas.
 *
 * Faz N chamadas paralelas (1 por conta). Pode falhar individualmente sem
 * derrubar a resposta inteira (account_status='error' marca a linha).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphGet } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";

export const runtime = "nodejs";

interface MetaAccountInsight {
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
  const period = PERIOD_MAP[url.searchParams.get("period") ?? "last_30d"] ?? "last_30d";

  const { data: accounts, error: accErr } = await supabase
    .from("ad_accounts")
    .select(`
      id, account_id, name, currency, account_status, balance_cents,
      meta_connections!inner(access_token_ciphertext, app_secret_ciphertext, status, business_manager_name)
    `)
    .order("name");

  if (accErr) {
    return NextResponse.json({ error: accErr.message }, { status: 500 });
  }

  const items = await Promise.all(
    (accounts ?? []).map(async (a: any) => {
      const conn = a.meta_connections;
      if (conn.status !== "active") {
        return formatAccount(a, null, "connection_invalid");
      }
      try {
        const { token, appSecret } = decryptCredentials(conn);
        const ins = await graphGet<{ data: MetaAccountInsight[] }>(
          token,
          `/${a.account_id}/insights`,
          {
            level: "account",
            date_preset: period,
            fields: "spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,action_values",
          },
          appSecret
        );
        return formatAccount(a, ins.data?.[0] ?? null, "ok");
      } catch (e: any) {
        return formatAccount(a, null, "graph_error", e.message);
      }
    })
  );

  return NextResponse.json({ accounts: items, period });
}

function formatAccount(
  a: any,
  ins: MetaAccountInsight | null,
  fetchStatus: "ok" | "connection_invalid" | "graph_error",
  errorMessage?: string
) {
  const purchases = parseAction(ins?.actions, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]);
  const revenue = parseAction(ins?.action_values, ["purchase", "omni_purchase", "offsite_conversion.fb_pixel_purchase"]);
  const leads = parseAction(ins?.actions, ["lead", "offsite_conversion.fb_pixel_lead"]);
  const messages = parseAction(ins?.actions, ["onsite_conversion.messaging_first_reply", "onsite_conversion.total_messaging_connection"]);
  const igVisits = parseAction(ins?.actions, ["onsite_conversion.ig_profile_visit", "ig_profile_visit"]);

  const spend = parseFloat(ins?.spend ?? "0");
  const impressions = parseInt(ins?.impressions ?? "0");
  const clicks = parseInt(ins?.clicks ?? "0");

  return {
    id: a.id,
    account_id: a.account_id,
    name: a.name,
    currency: a.currency,
    accountStatus: a.account_status === 1 ? "active" : "disabled",
    balance: a.balance_cents / 100,
    businessManagerName: a.meta_connections?.business_manager_name ?? null,
    fetchStatus,
    errorMessage: errorMessage ?? null,
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
    messages,
    igVisits,
    cpIgVisit: igVisits > 0 ? spend / igVisits : 0,
  };
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
