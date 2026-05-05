/**
 * GET /api/integracoes/attribution/by-product?from=ISO&to=ISO
 *
 * Agrega receita atribuída por produto (cross-gateway).
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

  // Vendas aprovadas no período (não filtra atribuição — produto vale mesmo sem match)
  const { data: rows, error } = await supabase
    .from("utm_sales_raw")
    .select("gateway,product_name,external_product_id,gross_value_cents,status")
    .eq("status", "approved")
    .gte("occurred_at", from)
    .lte("occurred_at", to);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Agrega por product_name (fallback external_product_id)
  type ProductBreak = {
    product_name: string;
    sales: number;
    revenue_cents: number;
    by_gateway: Record<string, { sales: number; revenue_cents: number }>;
  };
  const byProduct: Record<string, ProductBreak> = {};

  for (const r of (rows ?? []) as any[]) {
    const key = r.product_name?.trim() || r.external_product_id || "(sem produto)";
    const value = r.gross_value_cents ?? 0;
    const gateway = r.gateway ?? "unknown";

    if (!byProduct[key]) {
      byProduct[key] = {
        product_name: key,
        sales: 0,
        revenue_cents: 0,
        by_gateway: {},
      };
    }
    byProduct[key].sales++;
    byProduct[key].revenue_cents += value;
    byProduct[key].by_gateway[gateway] ??= { sales: 0, revenue_cents: 0 };
    byProduct[key].by_gateway[gateway].sales++;
    byProduct[key].by_gateway[gateway].revenue_cents += value;
  }

  const products = Object.values(byProduct).sort((a, b) => b.revenue_cents - a.revenue_cents);

  return NextResponse.json({
    period: { from, to },
    products,
  });
}
