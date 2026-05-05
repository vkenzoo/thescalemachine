/**
 * POST /api/meta/campaigns/:id
 *
 * Body: {
 *   status?:           "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED",
 *   daily_budget?:     number   // BRL (será convertido pra centavos antes de mandar pra Meta)
 *   lifetime_budget?:  number,  // BRL
 * }
 *
 * Resolve campaign meta_id → ad_account → connection → token, faz update na
 * Graph API (POST /{campaign_id}) e marca a connection como invalid se o
 * token for rejeitado.
 *
 * Tratamos como POST e não PATCH porque a Graph API da Meta usa POST pra updates,
 * e mantemos a paridade pra simplificar debug.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphPost, GraphError, isInvalidTokenError } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";

export const runtime = "nodejs";

// =============================================================
// DELETE /api/meta/campaigns/:id
// Marca como DELETED na Graph (não destrói histórico).
// =============================================================
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  return updateStatusToDeleted(await params);
}

async function updateStatusToDeleted({ id }: { id: string }) {
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

  if (!anyConn) {
    return NextResponse.json({ error: "no_connection" }, { status: 404 });
  }

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

type CampaignStatus = "ACTIVE" | "PAUSED" | "ARCHIVED" | "DELETED";

interface UpdateBody {
  status?: CampaignStatus;
  daily_budget?: number;
  lifetime_budget?: number;
}

const ALLOWED_STATUSES: CampaignStatus[] = ["ACTIVE", "PAUSED", "ARCHIVED", "DELETED"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: campaignMetaId } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => ({}))) as UpdateBody;

  // Valida o body
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

  // Resolve token via campaign → ad_account → connection.
  // Vamos buscar por user_id do campaign cache, mas se a campaign ainda não
  // foi sincronizada, fazemos fallback achando QUALQUER ad_account do user
  // ativa e tentamos. (Caminho feliz: o useMetaCampaigns popula campaigns no DB.)
  const { data: campaign } = await supabase
    .from("campaigns")
    .select("ad_account_id, ad_accounts!inner(account_id, connection_id, meta_connections!inner(access_token_ciphertext, app_secret_ciphertext, status))")
    .eq("meta_id", campaignMetaId)
    .eq("user_id", user.id)
    .maybeSingle();

  let connRow: { access_token_ciphertext: string; app_secret_ciphertext: string | null } | null = null;
  let connectionStatus: string | null = null;
  let connectionId: string | null = null;

  if (campaign) {
    const acc: any = (campaign as any).ad_accounts;
    if (acc?.meta_connections?.access_token_ciphertext) {
      connRow = {
        access_token_ciphertext: acc.meta_connections.access_token_ciphertext,
        app_secret_ciphertext: acc.meta_connections.app_secret_ciphertext ?? null,
      };
      connectionStatus = acc.meta_connections.status ?? null;
      connectionId = acc.connection_id ?? null;
    }
  } else {
    // Fallback: usa qualquer connection ativa (campaign ainda não sincronizada)
    const { data: anyConn } = await supabase
      .from("meta_connections")
      .select("id, access_token_ciphertext, app_secret_ciphertext, status")
      .eq("user_id", user.id)
      .eq("status", "active")
      .limit(1)
      .maybeSingle();
    if (anyConn) {
      connRow = {
        access_token_ciphertext: anyConn.access_token_ciphertext,
        app_secret_ciphertext: anyConn.app_secret_ciphertext ?? null,
      };
      connectionStatus = anyConn.status;
      connectionId = anyConn.id;
    }
  }

  if (!connRow || !connectionId) {
    return NextResponse.json({ error: "no_connection" }, { status: 404 });
  }
  if (connectionStatus !== "active") {
    return NextResponse.json(
      { error: "connection_invalid", status: connectionStatus },
      { status: 400 }
    );
  }

  const { token, appSecret } = decryptCredentials(connRow);

  try {
    const result = await graphPost<{ success: boolean }>(
      token,
      `/${campaignMetaId}`,
      updates,
      appSecret
    );

    // Atualiza cache local de forma otimista (best-effort, sem bloquear)
    if (campaign) {
      const cacheUpdate: Record<string, unknown> = {};
      if (updates.status) cacheUpdate.status = updates.status;
      if (updates.daily_budget) cacheUpdate.daily_budget_cents = updates.daily_budget;
      if (updates.lifetime_budget) cacheUpdate.lifetime_budget_cents = updates.lifetime_budget;
      if (Object.keys(cacheUpdate).length > 0) {
        await supabase
          .from("campaigns")
          .update(cacheUpdate)
          .eq("meta_id", campaignMetaId)
          .eq("user_id", user.id);
      }
    }

    return NextResponse.json({ ok: true, ...result });
  } catch (err) {
    // Token revogado → marca connection
    if (isInvalidTokenError(err)) {
      await supabase
        .from("meta_connections")
        .update({ status: "invalid" })
        .eq("id", connectionId);
      return NextResponse.json(
        { error: "token_invalid", message: "Reconecte sua conta Meta." },
        { status: 401 }
      );
    }

    if (err instanceof GraphError) {
      return NextResponse.json(
        { error: "graph_error", code: err.code, message: err.message },
        { status: err.httpStatus || 500 }
      );
    }

    return NextResponse.json(
      { error: "unknown", message: (err as Error).message },
      { status: 500 }
    );
  }
}
