/**
 * GET /api/meta/ads?account=act_X&period=last_30d&adset=ID
 *
 * Lista anúncios da conta com insights + previews/thumbnails.
 * Resolve creative em uma chamada separada (Graph não retorna thumbnail
 * direto no GET /ads sem expandir creative).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphGet } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";

export const runtime = "nodejs";

interface MetaAd {
  id: string;
  name: string;
  status: string;
  effective_status?: string;
  adset_id: string;
  campaign_id: string;
  creative?: {
    id: string;
    thumbnail_url?: string;
    image_url?: string;
    video_id?: string;
    object_story_spec?: any;
  };
}

interface MetaInsight {
  ad_id: string;
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
  const adsetFilter = url.searchParams.get("adset");

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
    // Estratégia anti-timeout pra contas grandes:
    // 1. Insights primeiro (filtra naturalmente ads sem atividade no período)
    // 2. Pega só os ad_ids que TIVERAM dados, busca structure só desses
    // 3. Pula DELETED/ARCHIVED de cara via filtering
    const insightsRes = await graphGet<{ data: MetaInsight[] }>(
      token, `/${adAccount.account_id}/insights`, {
        level: "ad",
        date_preset: period,
        fields: "ad_id,spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,action_values",
        limit: 500,
      }, appSecret
    ).catch(() => ({ data: [] as MetaInsight[] }));

    const adIdsWithData = insightsRes.data.map((i) => i.ad_id).filter(Boolean);

    // Se nenhum insight, retorna lista vazia (evita call grande à toa)
    if (adIdsWithData.length === 0) {
      return NextResponse.json({ ads: [], account_id: adAccount.account_id, period });
    }

    // Filtra ads pela lista de IDs ativos. Reduz drasticamente payload.
    const filtering = JSON.stringify([
      { field: "id", operator: "IN", value: adIdsWithData.slice(0, 500) },
    ]);

    const [structRes, adsetsRes, campaignsRes] = await Promise.all([
      graphGet<{ data: MetaAd[] }>(token, `/${adAccount.account_id}/ads`, {
        fields: "id,name,status,effective_status,adset_id,campaign_id,creative{id,thumbnail_url,image_url,video_id}",
        filtering,
        limit: 500,
      }, appSecret),
      graphGet<{ data: { id: string; name: string }[] }>(token, `/${adAccount.account_id}/adsets`, {
        fields: "id,name",
        limit: 500,
      }, appSecret).catch(() => ({ data: [] })),
      graphGet<{ data: { id: string; name: string }[] }>(token, `/${adAccount.account_id}/campaigns`, {
        fields: "id,name",
        limit: 500,
      }, appSecret).catch(() => ({ data: [] })),
    ]);

    const insightsMap = new Map<string, MetaInsight>();
    for (const i of insightsRes.data) insightsMap.set(i.ad_id, i);

    const adsetNameMap = new Map<string, string>();
    for (const a of adsetsRes.data) adsetNameMap.set(a.id, a.name);

    const campaignNameMap = new Map<string, string>();
    for (const c of campaignsRes.data) campaignNameMap.set(c.id, c.name);

    const filtered = adsetFilter
      ? structRes.data.filter((a) => a.adset_id === adsetFilter)
      : structRes.data;

    const ads = filtered.map((a) => {
      const ins = insightsMap.get(a.id);
      const purchases = parseAction(ins?.actions, ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"]);
      const revenue = parseAction(ins?.action_values, ["omni_purchase", "purchase", "offsite_conversion.fb_pixel_purchase"]);

      const spend = parseFloat(ins?.spend ?? "0");
      const impressions = parseInt(ins?.impressions ?? "0");
      const clicks = parseInt(ins?.clicks ?? "0");

      const creativeType = a.creative?.video_id ? "video" : a.creative?.image_url ? "image" : "unknown";

      return {
        id: a.id,
        name: a.name,
        status: a.status,
        effectiveStatus: a.effective_status,
        adsetId: a.adset_id,
        adsetName: adsetNameMap.get(a.adset_id) ?? "—",
        campaignId: a.campaign_id,
        campaignName: campaignNameMap.get(a.campaign_id) ?? "—",
        thumbnailUrl: a.creative?.thumbnail_url ?? a.creative?.image_url ?? null,
        creativeType,
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
        avgTicket: purchases > 0 ? revenue / purchases : 0,
      };
    });

    return NextResponse.json({ ads, account_id: adAccount.account_id, period });
  } catch (err: any) {
    console.error("[/api/meta/ads] graph_error:", err?.message, err?.code, err?.raw);
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
 * Pega valor da PRIMEIRA action_type da lista que existir.
 * Tipos como `purchase`/`omni_purchase`/`offsite_conversion.fb_pixel_purchase`
 * se sobrepõem (omni = total deduplicado). Somar duplica → usamos só o 1º match.
 * Ordem dos `types`: mais agregado primeiro.
 */
function parseAction(
  actions: { action_type: string; value: string }[] | undefined,
  types: string[]
): number {
  if (!actions) return 0;
  for (const t of types) {
    const a = actions.find((x) => x.action_type === t);
    if (a) return parseFloat(a.value || "0");
  }
  return 0;
}
