/**
 * POST /api/meta/adsets/:id
 *
 * Body: {
 *   status?:           "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED",
 *   daily_budget?:     number   // BRL
 *   lifetime_budget?:  number,  // BRL
 * }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphPost, GraphError, isInvalidTokenError } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";

export const runtime = "nodejs";

// =============================================================
// DELETE /api/meta/adsets/:id
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

type AdsetStatus = "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";

interface UpdateBody {
  status?: AdsetStatus;
  daily_budget?: number;
  lifetime_budget?: number;
}

const ALLOWED_STATUSES: AdsetStatus[] = ["ACTIVE", "PAUSED", "ARCHIVED", "DELETED"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: adsetMetaId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as UpdateBody;

  const updates: Record<string, string | number> = {};
  if (body.status !== undefined) {
    if (!ALLOWED_STATUSES.includes(body.status)) {
      return NextResponse.json({ error: "invalid_status" }, { status: 400 });
    }
    updates.status = body.status;
  }
  if (body.daily_budget !== undefined) {
    if (typeof body.daily_budget !== "number" || body.daily_budget < 0) {
      return NextResponse.json({ error: "invalid_daily_budget" }, { status: 400 });
    }
    updates.daily_budget = Math.round(body.daily_budget * 100);
  }
  if (body.lifetime_budget !== undefined) {
    if (typeof body.lifetime_budget !== "number" || body.lifetime_budget < 0) {
      return NextResponse.json({ error: "invalid_lifetime_budget" }, { status: 400 });
    }
    updates.lifetime_budget = Math.round(body.lifetime_budget * 100);
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "no_updates" }, { status: 400 });
  }

  // Adsets ainda não têm cache local — usa qualquer connection ativa do user
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
    const result = await graphPost(token, `/${adsetMetaId}`, updates, appSecret);
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
