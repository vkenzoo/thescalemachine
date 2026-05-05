/**
 * GET /api/meta/videos?account=act_X
 * Lista vídeos da conta (últimos 100).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphGet } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";

export const runtime = "nodejs";

interface MetaVideo {
  id: string;
  title?: string;
  description?: string;
  length?: number;
  created_time?: string;
  thumbnails?: { data: { uri: string; is_preferred?: boolean }[] };
}

export async function GET(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = new URL(req.url);
  const accountParam = url.searchParams.get("account");
  if (!accountParam) return NextResponse.json({ error: "missing_account" }, { status: 400 });

  const { data: adAccount } = await supabase
    .from("ad_accounts")
    .select("id, account_id, meta_connections!inner(access_token_ciphertext, app_secret_ciphertext, status)")
    .eq("account_id", accountParam)
    .eq("user_id", user.id)
    .single();

  if (!adAccount) return NextResponse.json({ error: "account_not_found" }, { status: 404 });

  const conn = (adAccount as any).meta_connections;
  if (conn.status !== "active") {
    return NextResponse.json({ error: "connection_invalid" }, { status: 400 });
  }

  const { token, appSecret } = decryptCredentials(conn);

  try {
    const res = await graphGet<{ data: MetaVideo[] }>(
      token,
      `/${adAccount.account_id}/advideos`,
      {
        fields: "id,title,description,length,created_time,thumbnails{uri,is_preferred}",
        limit: 100,
      },
      appSecret
    );

    const videos = (res.data ?? []).map((v) => {
      const preferredThumb = v.thumbnails?.data?.find((t) => t.is_preferred)?.uri ?? v.thumbnails?.data?.[0]?.uri ?? null;
      return {
        id: v.id,
        title: v.title || v.description || "(sem título)",
        thumbnailUrl: preferredThumb,
        lengthSeconds: v.length ?? null,
        createdAt: v.created_time ?? null,
      };
    });

    return NextResponse.json({ videos });
  } catch (err: any) {
    return NextResponse.json(
      { error: "graph_error", message: err.message },
      { status: 500 }
    );
  }
}
