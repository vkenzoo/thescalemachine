/**
 * Resolver UTM → Meta Ad (escopado por user_id).
 * Bate contra public.campaigns / public.adsets / public.ads (sync já existente).
 *
 * Algoritmo last-click em 5 níveis (decrescente em confiança):
 *   1. utm_id    == ads.meta_id                                   → 1.0
 *   2. utm_term  == ads.meta_id                                   → 1.0
 *   3. utm_content == adsets.meta_id  AND  utm_campaign == camp.meta_id → 0.9
 *   4. utm_campaign == campaigns.meta_id                          → 0.7
 *   5. utm_campaign LIKE campaigns.name (fuzzy)                   → 0.4
 *
 * Hotmart manda utm_term="120211999" — daria match no ad real.
 * Templates "Nome|ID" (ex: "Black Friday|120211000") são tratados — pegamos depois do "|".
 */

import type { SupabaseClient } from "@supabase/supabase-js";

interface SaleForResolve {
  id: string;
  user_id: string;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  utm_id: string | null;
}

export interface ResolveResult {
  matched: boolean;
  match_method: string;
  match_confidence: number;
  ad_id: string | null;
  adset_id: string | null;
  campaign_id: string | null;
  ad_account_id: string | null;
}

const DIRECT: ResolveResult = {
  matched: false,
  match_method: "direct",
  match_confidence: 0,
  ad_id: null, adset_id: null, campaign_id: null, ad_account_id: null,
};

/**
 * Templates UTM podem ter formato "Nome|ID" (ex: "Black Friday|120211000").
 * Extrai sempre o último segmento depois do "|" se houver, e retorna ambos.
 */
function extractIdAndName(value: string | null): { id: string | null; name: string | null } {
  if (!value) return { id: null, name: null };
  const trimmed = value.trim();
  if (trimmed.includes("|")) {
    const parts = trimmed.split("|");
    return { name: parts[0]?.trim() || null, id: parts[parts.length - 1]?.trim() || null };
  }
  // Sem "|": se é puro dígito, é ID; senão pode ser nome
  return /^\d{6,}$/.test(trimmed) ? { id: trimmed, name: null } : { id: trimmed, name: trimmed };
}

export async function resolveSaleAttribution(
  supabase: SupabaseClient,
  sale: SaleForResolve
): Promise<ResolveResult> {
  const userId = sale.user_id;

  const utmId = extractIdAndName(sale.utm_id);
  const utmTerm = extractIdAndName(sale.utm_term);
  const utmContent = extractIdAndName(sale.utm_content);
  const utmCampaign = extractIdAndName(sale.utm_campaign);

  // Nível 1+2: utm_id ou utm_term como meta_id de ad
  const adIdCandidates = [utmId.id, utmTerm.id].filter(Boolean) as string[];
  if (adIdCandidates.length > 0) {
    const { data: ad } = await supabase
      .from("ads")
      .select("id,adset_id,meta_id,adsets!inner(campaign_id,campaigns!inner(ad_account_id))")
      .eq("user_id", userId)
      .in("meta_id", adIdCandidates)
      .limit(1)
      .maybeSingle();
    if (ad) {
      const adsetRow = (ad as any).adsets;
      return {
        matched: true,
        match_method: utmId.id && ad.meta_id === utmId.id ? "utm_id" : "utm_term_ad_id",
        match_confidence: 1.0,
        ad_id: ad.id,
        adset_id: ad.adset_id,
        campaign_id: adsetRow?.campaign_id ?? null,
        ad_account_id: adsetRow?.campaigns?.ad_account_id ?? null,
      };
    }
  }

  // Nível 3: utm_content == adset.meta_id AND utm_campaign == campaign.meta_id
  if (utmContent.id && utmCampaign.id) {
    const { data: adset } = await supabase
      .from("adsets")
      .select("id,campaign_id,meta_id,campaigns!inner(meta_id,ad_account_id)")
      .eq("user_id", userId)
      .eq("meta_id", utmContent.id)
      .limit(1)
      .maybeSingle();
    if (adset && (adset as any).campaigns?.meta_id === utmCampaign.id) {
      return {
        matched: true,
        match_method: "triple_utm",
        match_confidence: 0.9,
        ad_id: null,
        adset_id: adset.id,
        campaign_id: adset.campaign_id,
        ad_account_id: (adset as any).campaigns?.ad_account_id ?? null,
      };
    }
  }

  // Nível 4: utm_campaign == campaign.meta_id
  if (utmCampaign.id) {
    const { data: camp } = await supabase
      .from("campaigns")
      .select("id,ad_account_id")
      .eq("user_id", userId)
      .eq("meta_id", utmCampaign.id)
      .limit(1)
      .maybeSingle();
    if (camp) {
      return {
        matched: true,
        match_method: "utm_campaign_only",
        match_confidence: 0.7,
        ad_id: null, adset_id: null,
        campaign_id: camp.id,
        ad_account_id: camp.ad_account_id,
      };
    }

    // Nível 5: fuzzy por nome
    if (utmCampaign.name) {
      const { data: campByName } = await supabase
        .from("campaigns")
        .select("id,ad_account_id")
        .eq("user_id", userId)
        .ilike("name", utmCampaign.name)
        .limit(1)
        .maybeSingle();
      if (campByName) {
        return {
          matched: true,
          match_method: "fuzzy_campaign_name",
          match_confidence: 0.4,
          ad_id: null, adset_id: null,
          campaign_id: campByName.id,
          ad_account_id: campByName.ad_account_id,
        };
      }
    }
  }

  return DIRECT;
}

export async function persistAttribution(
  supabase: SupabaseClient,
  saleId: string,
  userId: string,
  result: ResolveResult
) {
  const { error } = await supabase.from("utm_sales_attribution").upsert({
    sale_id: saleId,
    user_id: userId,
    matched: result.matched,
    match_method: result.match_method,
    match_confidence: result.match_confidence,
    ad_id: result.ad_id,
    adset_id: result.adset_id,
    campaign_id: result.campaign_id,
    ad_account_id: result.ad_account_id,
    attributed_at: new Date().toISOString(),
    is_active: true,
  }, { onConflict: "sale_id" });

  if (error) throw new Error("upsert attribution: " + error.message);
}
