/**
 * POST /api/meta/disconnect
 *
 * Marca a connection como 'revoked'. Não deleta — preserva histórico de campanhas
 * que dependem da FK. Ad accounts ficam órfãs mas inativas (status=disabled via cascade-update).
 *
 * Body: { connection_id: uuid }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { connection_id } = await req.json().catch(() => ({}));
  if (!connection_id) {
    return NextResponse.json({ error: "missing_connection_id" }, { status: 400 });
  }

  const { error } = await supabase
    .from("meta_connections")
    .update({ status: "revoked", updated_at: new Date().toISOString() })
    .eq("id", connection_id)
    .eq("user_id", user.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}
