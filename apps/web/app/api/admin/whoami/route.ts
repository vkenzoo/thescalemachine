/**
 * GET /api/admin/whoami
 *
 * Debug-only: retorna o que o servidor enxerga (email + se é admin).
 * NÃO retorna a lista de emails admin pra não vazar.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const adminEnvSet = !!process.env.ADMIN_EMAILS;
  const adminEnvLength = (process.env.ADMIN_EMAILS ?? "").length;
  const adminCount = (process.env.ADMIN_EMAILS ?? "")
    .split(",").map((s) => s.trim()).filter(Boolean).length;

  let isAdmin = false;
  if (user?.email && adminEnvSet) {
    const list = (process.env.ADMIN_EMAILS ?? "")
      .split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
    isAdmin = list.includes(user.email.toLowerCase());
  }

  return NextResponse.json({
    logged_in: !!user,
    email: user?.email ?? null,
    admin_env_set: adminEnvSet,
    admin_env_count: adminCount,
    admin_env_chars: adminEnvLength,
    is_admin: isAdmin,
  });
}
