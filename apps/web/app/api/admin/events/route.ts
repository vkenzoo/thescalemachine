/**
 * GET /api/admin/events?severity=&area=&user_id=&limit=200&since=ISO
 *
 * Lê audit_events. Acesso restrito via requireAdmin.
 */

import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const url = new URL(req.url);
  const severity = url.searchParams.get("severity"); // info|warning|error
  const area = url.searchParams.get("area");
  const userId = url.searchParams.get("user_id");
  const limit = Math.min(parseInt(url.searchParams.get("limit") ?? "200"), 500);
  const since = url.searchParams.get("since");

  const supabase = createAdminClient();
  let q = supabase
    .from("audit_events")
    .select("id,created_at,severity,area,message,user_id,tags,extra,stack")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (severity) q = q.eq("severity", severity);
  if (area) q = q.eq("area", area);
  if (userId) q = q.eq("user_id", userId);
  if (since) q = q.gte("created_at", since);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Enriquece com email do user (se houver)
  const userIds = Array.from(new Set((data ?? []).map((e: any) => e.user_id).filter(Boolean)));
  let emailById: Record<string, string> = {};
  if (userIds.length > 0) {
    // Fetch via auth.admin (service role)
    const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });
    for (const u of users ?? []) {
      if (userIds.includes(u.id)) emailById[u.id] = u.email ?? "—";
    }
  }

  const events = (data ?? []).map((e: any) => ({
    ...e,
    user_email: e.user_id ? emailById[e.user_id] ?? null : null,
  }));

  return NextResponse.json({ events });
}
