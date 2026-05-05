/**
 * GET /api/meta/pixels?account=act_X
 * Lista pixels do Facebook da conta + último evento.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphGet } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";

export const runtime = "nodejs";

interface MetaPixel {
  id: string;
  name: string;
  code?: string;
  creation_time?: string;
  is_unavailable?: boolean;
  last_fired_time?: string;
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
    const res = await graphGet<{ data: MetaPixel[] }>(
      token,
      `/${adAccount.account_id}/adspixels`,
      {
        fields: "id,name,creation_time,is_unavailable,last_fired_time",
        limit: 50,
      },
      appSecret
    );

    const pixels = (res.data ?? []).map((p) => ({
      id: p.id,
      name: p.name,
      lastFiredTime: p.last_fired_time ?? null,
      isUnavailable: !!p.is_unavailable,
    }));

    return NextResponse.json({ pixels });
  } catch (err: any) {
    return NextResponse.json(
      { error: "graph_error", message: err.message },
      { status: 500 }
    );
  }
}
