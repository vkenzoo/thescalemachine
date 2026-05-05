/**
 * POST /api/meta/campaigns/:id/duplicate
 *
 * Duplica campanha via Marketing API /copies. Copia também adsets e ads.
 * Body opcional: { deep_copy?: boolean (default true), name_suffix?: string (default " - Copy") }
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphPost, GraphError, isInvalidTokenError } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";

export const runtime = "nodejs";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const deepCopy = body.deep_copy !== false; // default true (copia adsets+ads)

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
    // Marketing API: POST /{campaign_id}/copies?deep_copy=true&status_option=PAUSED
    const result = await graphPost<{ copied_campaign_id: string; ad_object_ids: any[] }>(
      token,
      `/${id}/copies`,
      {
        deep_copy: deepCopy,
        status_option: "PAUSED", // duplicada começa pausada (boa prática)
      },
      appSecret
    );
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
