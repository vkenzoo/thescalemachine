/**
 * GET /api/admin/db-stats
 *
 * Estatísticas de tabelas principais (tamanho lógico).
 */

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TABLES = [
  "meta_connections",
  "ad_accounts",
  "campaigns",
  "adsets",
  "ads",
  "meta_pages",
  "meta_pixels",
  "rules",
  "alerts",
  "rule_executions",
  "alert_events",
  "notifications",
  "utm_projects",
  "utm_sales_raw",
  "utm_sales_attribution",
  "reports",
  "custom_metrics",
  "audit_events",
];

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const supabase = createAdminClient();

  const counts = await Promise.all(
    TABLES.map(async (t) => {
      const { count, error } = await supabase.from(t).select("id", { count: "exact", head: true });
      return { table: t, count: count ?? 0, error: error?.message ?? null };
    })
  );

  // Métricas semânticas
  const totals = Object.fromEntries(counts.map((c) => [c.table, c.count])) as Record<string, number>;

  // Match rate global (atribuição matched / total)
  const { data: attrSample } = await supabase
    .from("utm_sales_attribution")
    .select("matched");
  const attrTotal = attrSample?.length ?? 0;
  const attrMatched = (attrSample ?? []).filter((a: any) => a.matched).length;
  const matchRate = attrTotal > 0 ? attrMatched / attrTotal : null;

  return NextResponse.json({
    tables: counts,
    semantic: {
      total_match_rate: matchRate,
      total_attributions: attrTotal,
      total_matched: attrMatched,
    },
  });
}
