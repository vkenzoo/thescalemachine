/**
 * GET /api/integracoes/attribution/health?from=ISO&to=ISO
 *
 * Health da atribuição: % match, breakdown por método, top vendas sem match.
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

  // Pega todas atribuições + occurred_at da venda no período
  const { data: rows, error } = await supabase
    .from("utm_sales_attribution")
    .select(`
      id, matched, match_method, match_confidence,
      utm_sales_raw!inner(id,occurred_at,status,utm_campaign,utm_term,utm_content,gross_value_cents,product_name,gateway)
    `)
    .gte("utm_sales_raw.occurred_at", from)
    .lte("utm_sales_raw.occurred_at", to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let total = 0, matched = 0, unmatched = 0;
  const byMethod: Record<string, number> = {};
  const unmatchedSales: any[] = [];
  let totalConfidence = 0;

  for (const r of (rows ?? []) as any[]) {
    const sale = r.utm_sales_raw;
    if (sale?.status !== "approved") continue;
    total++;
    if (r.matched) {
      matched++;
      totalConfidence += Number(r.match_confidence) || 0;
      const m = r.match_method ?? "unknown";
      byMethod[m] = (byMethod[m] ?? 0) + 1;
    } else {
      unmatched++;
      if (unmatchedSales.length < 20) {
        unmatchedSales.push({
          sale_id: sale.id,
          occurred_at: sale.occurred_at,
          gateway: sale.gateway,
          product_name: sale.product_name,
          gross_value_cents: sale.gross_value_cents,
          utm_campaign: sale.utm_campaign,
          utm_content: sale.utm_content,
          utm_term: sale.utm_term,
        });
      }
    }
  }

  const matchRate = total > 0 ? matched / total : null;
  const avgConfidence = matched > 0 ? totalConfidence / matched : null;

  return NextResponse.json({
    period: { from, to },
    total,
    matched,
    unmatched,
    match_rate: matchRate,
    avg_confidence: avgConfidence,
    by_method: byMethod,
    recent_unmatched: unmatchedSales,
  });
}
