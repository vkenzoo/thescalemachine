/**
 * GET /api/meta/audiences?account=act_X
 * Lista custom audiences existentes da conta + lookalike + engagement.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphGet } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";

export const runtime = "nodejs";

interface MetaAudience {
  id: string;
  name: string;
  subtype: string;
  description?: string;
  approximate_count_lower_bound?: number;
  approximate_count_upper_bound?: number;
  delivery_status?: { code: number; description: string };
  retention_days?: number;
  operation_status?: { code: number; description: string };
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
    const res = await graphGet<{ data: MetaAudience[] }>(
      token,
      `/${adAccount.account_id}/customaudiences`,
      {
        fields: "id,name,subtype,description,approximate_count_lower_bound,approximate_count_upper_bound,delivery_status,retention_days,operation_status",
        limit: 200,
      },
      appSecret
    );

    const audiences = (res.data ?? []).map((a) => {
      // Meta agora retorna lower/upper bound. Usa o lower como aproximação (mais conservador).
      const count = a.approximate_count_lower_bound ?? null;
      return {
        id: a.id,
        name: a.name,
        subtype: a.subtype,
        description: a.description ?? null,
        approximateCount: count,
        approximateCountLower: a.approximate_count_lower_bound ?? null,
        approximateCountUpper: a.approximate_count_upper_bound ?? null,
        retentionDays: a.retention_days ?? null,
        deliveryStatus: a.delivery_status?.description ?? null,
        deliveryStatusCode: a.delivery_status?.code ?? null,
      };
    });

    return NextResponse.json({ audiences });
  } catch (err: any) {
    return NextResponse.json(
      { error: "graph_error", message: err.message },
      { status: 500 }
    );
  }
}
