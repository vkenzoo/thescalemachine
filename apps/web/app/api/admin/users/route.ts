/**
 * GET /api/admin/users
 *
 * Lista usuários com contagens (ad_accounts, utm_projects, last_sign_in).
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

  const { data: { users } } = await supabase.auth.admin.listUsers({ perPage: 1000 });

  // Counts agregados
  const userIds = (users ?? []).map((u) => u.id);
  const [accCounts, projectCounts, eventCounts] = await Promise.all([
    countByUser(supabase, "ad_accounts", userIds),
    countByUser(supabase, "utm_projects", userIds),
    countByUser(supabase, "audit_events", userIds, "error"),
  ]);

  const enriched = (users ?? []).map((u) => ({
    id: u.id,
    email: u.email,
    name: (u.user_metadata?.name ?? u.user_metadata?.full_name ?? null) as string | null,
    created_at: u.created_at,
    last_sign_in_at: u.last_sign_in_at ?? null,
    confirmed: !!u.email_confirmed_at,
    ad_accounts: accCounts[u.id] ?? 0,
    utm_projects: projectCounts[u.id] ?? 0,
    errors_count: eventCounts[u.id] ?? 0,
  }));

  // Ordena por created_at desc
  enriched.sort((a, b) => (b.created_at ?? "").localeCompare(a.created_at ?? ""));

  return NextResponse.json({
    users: enriched,
    total: enriched.length,
    confirmed: enriched.filter((u) => u.confirmed).length,
    last_7d_signups: enriched.filter((u) => {
      if (!u.created_at) return false;
      return new Date(u.created_at).getTime() > Date.now() - 7 * 86400000;
    }).length,
  });
}

async function countByUser(
  supabase: ReturnType<typeof createAdminClient>,
  table: string,
  userIds: string[],
  severity?: string
): Promise<Record<string, number>> {
  if (userIds.length === 0) return {};
  let q = supabase.from(table).select("user_id", { count: "exact" }).in("user_id", userIds);
  if (severity) q = q.eq("severity", severity);
  const { data } = await q;
  const out: Record<string, number> = {};
  for (const row of data ?? []) {
    const uid = (row as any).user_id;
    out[uid] = (out[uid] ?? 0) + 1;
  }
  return out;
}
