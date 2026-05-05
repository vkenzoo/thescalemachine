/**
 * GET /api/reports/public/[slug]?period=last_30d
 *
 * Endpoint público — retorna config do relatório + métricas agregadas reais.
 * Usa service role pra bypass RLS (a policy is_public=true também funcionaria,
 * mas service role facilita o JOIN com meta_connections do dono do relatório).
 *
 * Período suportado: today, yesterday, last_7d, last_30d, this_month, last_month.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decryptCredentials } from "@/lib/meta/conn-credentials";
import { graphGet, isInvalidTokenError } from "@/lib/meta/graph-client";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PERIOD_PRESETS: Record<string, string> = {
  today: "today",
  yesterday: "yesterday",
  last_7d: "last_7d",
  last_14d: "last_14d",
  last_30d: "last_30d",
  this_month: "this_month",
  last_month: "last_month",
  maximum: "maximum",
};

interface AccountAggregate {
  account_id: string;
  name: string;
  spend: number;
  impressions: number;
  reach: number;
  clicks: number;
  ctr: number;
  cpc: number;
  cpm: number;
  frequency: number;
  actions: Record<string, number>;
  action_values: Record<string, number>;
}

export async function GET(
  req: NextRequest,
  { params }: { params: { slug: string } }
) {
  const slug = params.slug;
  if (!slug) return NextResponse.json({ error: "missing_slug" }, { status: 400 });

  const period = new URL(req.url).searchParams.get("period") ?? "last_30d";
  const datePreset = PERIOD_PRESETS[period] ?? "last_30d";

  const supabase = createAdminClient();

  const { data: report, error: rErr } = await supabase
    .from("reports")
    .select("id,user_id,slug,name,level,accounts,ig_account,metrics,sections,funnel_steps,is_public,password_hash,views")
    .eq("slug", slug)
    .maybeSingle();

  if (rErr || !report) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!report.is_public) return NextResponse.json({ error: "private" }, { status: 403 });
  // Senha: deixa o front prompt; aqui só retornamos has_password=true e nada mais
  if (report.password_hash) {
    const provided = req.headers.get("x-report-password");
    const { createHash } = await import("node:crypto");
    const ok = provided && createHash("sha256").update(provided).digest("hex") === report.password_hash;
    if (!ok) {
      return NextResponse.json({ requires_password: true, name: report.name }, { status: 401 });
    }
  }

  // Pega meta_connection do dono (1 conexão simplifica MVP)
  const { data: conn } = await supabase
    .from("meta_connections")
    .select("access_token_ciphertext,app_secret_ciphertext,status")
    .eq("user_id", report.user_id)
    .eq("status", "active")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (!conn) {
    return NextResponse.json({
      report: { name: report.name, level: report.level, metrics: report.metrics, sections: report.sections, funnel_steps: report.funnel_steps },
      data: null,
      warning: "owner_no_meta_connection",
    });
  }

  const { token, appSecret } = decryptCredentials(conn);

  // Busca insights agregados + top campanhas pra cada account
  const accountsAgg: AccountAggregate[] = [];
  const allCampaigns: Array<any> = [];

  for (const accId of report.accounts as string[]) {
    try {
      // Account-level totals
      const insightsRes = await graphGet<{ data: any[] }>(
        token,
        `/${accId}/insights`,
        {
          level: "account",
          date_preset: datePreset,
          fields: "spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,action_values,account_currency,account_name",
        },
        appSecret
      );
      const ins = insightsRes.data?.[0] ?? {};
      const actions = (ins.actions ?? []).reduce((acc: any, a: any) => {
        acc[a.action_type] = parseFloat(a.value); return acc;
      }, {});
      const actionValues = (ins.action_values ?? []).reduce((acc: any, a: any) => {
        acc[a.action_type] = parseFloat(a.value); return acc;
      }, {});

      accountsAgg.push({
        account_id: accId,
        name: ins.account_name ?? accId,
        spend: parseFloat(ins.spend ?? "0"),
        impressions: parseInt(ins.impressions ?? "0"),
        reach: parseInt(ins.reach ?? "0"),
        clicks: parseInt(ins.clicks ?? "0"),
        ctr: parseFloat(ins.ctr ?? "0") / 100,
        cpc: parseFloat(ins.cpc ?? "0"),
        cpm: parseFloat(ins.cpm ?? "0"),
        frequency: parseFloat(ins.frequency ?? "0"),
        actions,
        action_values: actionValues,
      });

      // Top campaigns (level=campaign)
      const campsRes = await graphGet<{ data: any[] }>(
        token,
        `/${accId}/insights`,
        {
          level: "campaign",
          date_preset: datePreset,
          fields: "campaign_id,campaign_name,spend,impressions,reach,clicks,ctr,cpc,cpm,frequency,actions,action_values",
          limit: 50,
        },
        appSecret
      );
      for (const c of campsRes.data ?? []) {
        const cActions = (c.actions ?? []).reduce((acc: any, a: any) => { acc[a.action_type] = parseFloat(a.value); return acc; }, {});
        const cActionValues = (c.action_values ?? []).reduce((acc: any, a: any) => { acc[a.action_type] = parseFloat(a.value); return acc; }, {});
        allCampaigns.push({
          account_id: accId,
          campaign_id: c.campaign_id,
          name: c.campaign_name,
          spend: parseFloat(c.spend ?? "0"),
          impressions: parseInt(c.impressions ?? "0"),
          reach: parseInt(c.reach ?? "0"),
          clicks: parseInt(c.clicks ?? "0"),
          ctr: parseFloat(c.ctr ?? "0") / 100,
          cpc: parseFloat(c.cpc ?? "0"),
          cpm: parseFloat(c.cpm ?? "0"),
          frequency: parseFloat(c.frequency ?? "0"),
          purchases: cActions["purchase"] ?? cActions["omni_purchase"] ?? 0,
          purchase_value: cActionValues["purchase"] ?? cActionValues["omni_purchase"] ?? 0,
        });
      }
    } catch (e: any) {
      if (isInvalidTokenError(e)) {
        await supabase.from("meta_connections").update({ status: "invalid" }).eq("user_id", report.user_id);
      }
      console.error("[reports/public] account error:", accId, e?.message);
    }
  }

  // Totais consolidados
  const totals = accountsAgg.reduce((t, a) => ({
    spend: t.spend + a.spend,
    impressions: t.impressions + a.impressions,
    reach: t.reach + a.reach,
    clicks: t.clicks + a.clicks,
    purchases: t.purchases + (a.actions["purchase"] ?? a.actions["omni_purchase"] ?? 0),
    purchase_value: t.purchase_value + (a.action_values["purchase"] ?? a.action_values["omni_purchase"] ?? 0),
    leads: t.leads + (a.actions["lead"] ?? 0),
    messages: t.messages + (a.actions["onsite_conversion.messaging_first_reply"] ?? a.actions["messaging_conversation_started_7d"] ?? 0),
    ig_visits: t.ig_visits + (a.actions["page_engagement"] ?? 0),
  }), { spend: 0, impressions: 0, reach: 0, clicks: 0, purchases: 0, purchase_value: 0, leads: 0, messages: 0, ig_visits: 0 });

  const ctr = totals.impressions > 0 ? totals.clicks / totals.impressions : 0;
  const cpc = totals.clicks > 0 ? totals.spend / totals.clicks : 0;
  const cpm = totals.impressions > 0 ? (totals.spend / totals.impressions) * 1000 : 0;
  const roas = totals.spend > 0 ? totals.purchase_value / totals.spend : 0;
  const cpa = totals.purchases > 0 ? totals.spend / totals.purchases : 0;
  const cpl = totals.leads > 0 ? totals.spend / totals.leads : 0;

  // Atribuição UTM (do owner) — receita real cruzada por conta
  const { data: attrSummary } = await supabase
    .from("utm_sales_attribution")
    .select("ad_account_id,is_active,utm_sales_raw!inner(gross_value_cents,status)")
    .eq("user_id", report.user_id)
    .eq("is_active", true);

  const utmRevenue = (attrSummary ?? []).reduce((s: number, r: any) => {
    const sale = r.utm_sales_raw;
    if (sale?.status === "approved") return s + (sale.gross_value_cents ?? 0);
    return s;
  }, 0) / 100;

  // Top campaigns ordenadas por spend
  const topCampaigns = allCampaigns.sort((a, b) => b.spend - a.spend).slice(0, 10);

  // Bump views
  await supabase.rpc("increment_report_views", { p_slug: slug });

  return NextResponse.json({
    report: {
      name: report.name,
      level: report.level,
      metrics: report.metrics,
      sections: report.sections,
      funnel_steps: report.funnel_steps,
      ig_account: report.ig_account,
    },
    period,
    totals: {
      ...totals,
      ctr,
      cpc,
      cpm,
      roas,
      cpa,
      cpl,
      utm_revenue: utmRevenue,
    },
    accounts: accountsAgg,
    campaigns: topCampaigns,
  });
}
