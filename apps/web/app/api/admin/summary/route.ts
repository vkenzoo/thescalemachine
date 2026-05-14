/**
 * GET /api/admin/summary
 *
 * Health geral do sistema nas últimas 24h:
 *  - Erros total + por área
 *  - Webhooks recebidos (sucesso vs falha) por gateway
 *  - Crons que falharam
 *  - Tokens Meta inválidos
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const supabase = createAdminClient();
  const since24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  const since7d = new Date(Date.now() - 7 * 86400000).toISOString();

  // Eventos últimas 24h por severity
  const { data: events24h } = await supabase
    .from("audit_events")
    .select("severity, area")
    .gte("created_at", since24h);

  const errors24h = (events24h ?? []).filter((e) => e.severity === "error").length;
  const warnings24h = (events24h ?? []).filter((e) => e.severity === "warning").length;

  // Por área
  const errorsByArea: Record<string, number> = {};
  for (const e of events24h ?? []) {
    if (e.severity === "error") {
      errorsByArea[e.area] = (errorsByArea[e.area] ?? 0) + 1;
    }
  }

  // Webhooks recebidos 24h (utm_sales_raw)
  const { count: webhooks24h } = await supabase
    .from("utm_sales_raw")
    .select("id", { count: "exact", head: true })
    .gte("received_at", since24h);

  // Por gateway
  const { data: webhooksByGw } = await supabase
    .from("utm_sales_raw")
    .select("gateway")
    .gte("received_at", since7d);
  const gatewayCount: Record<string, number> = {};
  for (const w of webhooksByGw ?? []) {
    gatewayCount[w.gateway] = (gatewayCount[w.gateway] ?? 0) + 1;
  }

  // Tokens Meta inválidos
  const { count: invalidTokens } = await supabase
    .from("meta_connections")
    .select("id", { count: "exact", head: true })
    .eq("status", "invalid");

  // Total de conexões ativas
  const { count: activeTokens } = await supabase
    .from("meta_connections")
    .select("id", { count: "exact", head: true })
    .eq("status", "active");

  return NextResponse.json({
    period: "24h",
    errors_24h: errors24h,
    warnings_24h: warnings24h,
    errors_by_area: errorsByArea,
    webhooks_24h: webhooks24h ?? 0,
    webhooks_by_gateway_7d: gatewayCount,
    invalid_tokens: invalidTokens ?? 0,
    active_tokens: activeTokens ?? 0,
  });
}
