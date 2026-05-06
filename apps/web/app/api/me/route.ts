/**
 * GET /api/me — retorna user logado (email, nome) pra UI mostrar no header.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ user: null }, { status: 401 });

  const meta = (user.user_metadata ?? {}) as Record<string, any>;
  const name = meta.name ?? meta.full_name ?? user.email?.split("@")[0] ?? null;

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name,
    },
  });
}
