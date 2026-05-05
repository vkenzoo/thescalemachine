/**
 * POST /api/meta/bulk-apply-utms
 * Body: { campaign_ids: string[], template: string }
 *
 * Pra cada campaign_id (Meta meta_id), busca todos os ads daquela campanha
 * via Graph API, e dá POST em cada ad setando `url_tags` = template.
 *
 * Retorna agregação: total_ads, success, failed, errors[].
 *
 * Restrição de segurança: o user só pode aplicar em campanhas que ele tem
 * sincronizadas (validamos que a campaign existe na nossa DB e pertence ao user).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphGet, graphPost, isInvalidTokenError } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";

export const runtime = "nodejs";
export const maxDuration = 60;

interface AdSummary { id: string; campaign_id: string; }

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const campaignIds: string[] = Array.isArray(body.campaign_ids) ? body.campaign_ids.map(String) : [];
  const template = String(body.template ?? "").trim();

  if (campaignIds.length === 0) return NextResponse.json({ error: "missing_campaign_ids" }, { status: 400 });
  if (!template) return NextResponse.json({ error: "missing_template" }, { status: 400 });

  // Pega campanhas sync que pertencem ao user, junto com a connection
  const { data: campRows } = await supabase
    .from("campaigns")
    .select("meta_id,ad_account_id,ad_accounts!inner(account_id,meta_connections!inner(access_token_ciphertext,app_secret_ciphertext,status))")
    .eq("user_id", user.id)
    .in("meta_id", campaignIds);

  if (!campRows || campRows.length === 0) {
    return NextResponse.json({ error: "no_campaigns_found" }, { status: 404 });
  }

  // Agrupa: pra cada (account_id, conn) pegamos todos os meta_ids de campanha
  type Group = { accountId: string; token: string; appSecret: string | null; campaignMetaIds: string[] };
  const groups = new Map<string, Group>();

  for (const c of campRows as any[]) {
    const acc = c.ad_accounts;
    const conn = acc.meta_connections;
    if (conn.status !== "active") continue;
    const key = acc.account_id;
    if (!groups.has(key)) {
      const { token, appSecret } = decryptCredentials(conn);
      groups.set(key, { accountId: acc.account_id, token, appSecret, campaignMetaIds: [] });
    }
    groups.get(key)!.campaignMetaIds.push(c.meta_id);
  }

  let totalAds = 0;
  let success = 0;
  let failed = 0;
  const errors: Array<{ id: string; message: string }> = [];

  for (const g of groups.values()) {
    try {
      // Busca ads das campanhas do grupo (filtering=campaign_id IN [...])
      // Mais barato: 1 GET /{ad_account}/ads?filtering=...
      const filtering = encodeURIComponent(JSON.stringify([{
        field: "campaign.id",
        operator: "IN",
        value: g.campaignMetaIds,
      }]));

      const adsRes = await graphGet<{ data: AdSummary[] }>(
        g.token,
        `/${g.accountId}/ads`,
        { fields: "id,campaign_id", filtering, limit: 500 },
        g.appSecret
      );

      const ads = adsRes.data ?? [];
      totalAds += ads.length;

      // Aplica em chunks de 5 paralelo
      for (let i = 0; i < ads.length; i += 5) {
        const chunk = ads.slice(i, i + 5);
        const results = await Promise.allSettled(chunk.map(async (ad) => {
          await graphPost(g.token, `/${ad.id}`, { url_tags: template }, g.appSecret);
        }));
        for (let j = 0; j < results.length; j++) {
          if (results[j].status === "fulfilled") success++;
          else {
            failed++;
            const reason = (results[j] as any).reason;
            errors.push({ id: chunk[j].id, message: reason?.message ?? "Erro desconhecido" });
          }
        }
      }
    } catch (e: any) {
      if (isInvalidTokenError(e)) {
        await supabase.from("meta_connections").update({ status: "invalid" })
          .eq("user_id", user.id);
      }
      errors.push({ id: g.accountId, message: e.message ?? "Erro buscando ads" });
    }
  }

  return NextResponse.json({
    ok: failed === 0,
    total_ads: totalAds,
    success,
    failed,
    errors: errors.slice(0, 20),
  });
}
