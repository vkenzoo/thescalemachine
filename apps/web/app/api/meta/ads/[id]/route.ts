/**
 * POST /api/meta/ads/:id
 *
 * Body: { status?: "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED" }
 *
 * Anúncios não têm orçamento — só status.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphPost, GraphError, isInvalidTokenError } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";

export const runtime = "nodejs";

// =============================================================
// DELETE /api/meta/ads/:id
// =============================================================
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: anyConn } = await supabase
    .from("meta_connections")
    .select("id, access_token_ciphertext, app_secret_ciphertext, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!anyConn) return NextResponse.json({ error: "no_connection" }, { status: 404 });

  const { token, appSecret } = decryptCredentials(anyConn);

  try {
    const result = await graphPost(token, `/${id}`, { status: "DELETED" }, appSecret);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (isInvalidTokenError(err)) {
      await supabase.from("meta_connections").update({ status: "invalid" }).eq("id", anyConn.id);
      return NextResponse.json({ error: "token_invalid" }, { status: 401 });
    }
    if (err instanceof GraphError) {
      return NextResponse.json(
        { error: "graph_error", code: err.code, message: err.message },
        { status: err.httpStatus || 500 }
      );
    }
    return NextResponse.json({ error: "unknown", message: (err as Error).message }, { status: 500 });
  }
}

type AdStatus = "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";
const ALLOWED_STATUSES: AdStatus[] = ["ACTIVE", "PAUSED", "ARCHIVED", "DELETED"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: adMetaId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as { status?: AdStatus };

  if (!body.status || !ALLOWED_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "invalid_status" }, { status: 400 });
  }

  const { data: anyConn } = await supabase
    .from("meta_connections")
    .select("id, access_token_ciphertext, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!anyConn) {
    return NextResponse.json({ error: "no_connection" }, { status: 404 });
  }

  const token = decrypt(anyConn.access_token_ciphertext);

  try {
    const result = await graphPost(token, `/${adMetaId}`, { status: body.status }, appSecret);
    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    if (isInvalidTokenError(err)) {
      await supabase.from("meta_connections").update({ status: "invalid" }).eq("id", anyConn.id);
      return NextResponse.json({ error: "token_invalid" }, { status: 401 });
    }
    if (err instanceof GraphError) {
      return NextResponse.json(
        { error: "graph_error", code: err.code, message: err.message },
        { status: err.httpStatus || 500 }
      );
    }
    return NextResponse.json({ error: "unknown", message: (err as Error).message }, { status: 500 });
  }
}
