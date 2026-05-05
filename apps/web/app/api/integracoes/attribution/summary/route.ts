/**
 * GET /api/integracoes/attribution/summary?from=ISO&to=ISO&account=act_xxx
 *
 * Retorna agregado de receita atribuída por campanha (meta_id) no período.
 * Frontend dá merge com a tabela de campanhas pra mostrar Receita Real / ROAS Real.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const from = url.searchParams.get("from") ?? new Date(Date.now() - 30 * 86400000).toISOString();
  const to = url.searchParams.get("to") ?? new Date().toISOString();
  const account = url.searchParams.get("account"); // 'act_xxx' ou null

  // Pega vendas atribuídas no período + JOIN com sale (ocorrência) e campanha (meta_id)
  // RLS garante user-scope.
  let q = supabase
    .from("utm_sales_attribution")
    .select(`
      campaign_id,
      ad_id,
      adset_id,
      ad_account_id,
      is_active,
      utm_sales_raw!inner(occurred_at,gross_value_cents,status,currency),
      campaigns(meta_id,name)
    `)
    .gte("utm_sales_raw.occurred_at", from)
    .lte("utm_sales_raw.occurred_at", to);

  // Se foi pedida uma conta específica, filtra
  if (account) {
    const { data: accRow } = await supabase
      .from("ad_accounts")
      .select("id")
      .eq("account_id", account)
      .maybeSingle();
    if (accRow?.id) q = q.eq("ad_account_id", accRow.id);
  }

  const { data: rows, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Agrega por campaign meta_id
  const byCampaign: Record<string, {
    meta_id: string;
    sales: number; revenue_cents: number;
    refunds: number; refunded_cents: number;
    direct_sales: number; direct_revenue_cents: number;
  }> = {};

  let totalSales = 0, totalRevenue = 0, totalRefunds = 0, totalRefundedRevenue = 0;
  let directSales = 0, directRevenue = 0;

  for (const r of (rows ?? []) as any[]) {
    const sale = r.utm_sales_raw;
    const camp = r.campaigns;
    const status = sale?.status;
    const value = sale?.gross_value_cents ?? 0;

    if (status === "refunded" || status === "chargedback") {
      totalRefunds++;
      totalRefundedRevenue += value;
      if (camp?.meta_id) {
        const b = (byCampaign[camp.meta_id] ??= {
          meta_id: camp.meta_id, sales: 0, revenue_cents: 0,
          refunds: 0, refunded_cents: 0,
          direct_sales: 0, direct_revenue_cents: 0,
        });
        b.refunds++; b.refunded_cents += value;
      }
      continue;
    }

    if (status !== "approved") continue;
    totalSales++; totalRevenue += value;

    if (!camp?.meta_id) {
      directSales++; directRevenue += value;
      continue;
    }
    const b = (byCampaign[camp.meta_id] ??= {
      meta_id: camp.meta_id, sales: 0, revenue_cents: 0,
      refunds: 0, refunded_cents: 0,
      direct_sales: 0, direct_revenue_cents: 0,
    });
    if (r.is_active) {
      b.sales++; b.revenue_cents += value;
    }
  }

  return NextResponse.json({
    period: { from, to },
    totals: {
      sales: totalSales,
      revenue_cents: totalRevenue,
      refunds: totalRefunds,
      refunded_revenue_cents: totalRefundedRevenue,
      direct_sales: directSales,
      direct_revenue_cents: directRevenue,
    },
    by_campaign: Object.values(byCampaign),
  });
}
