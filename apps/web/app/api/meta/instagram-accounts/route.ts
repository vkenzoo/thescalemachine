/**
 * GET /api/meta/instagram-accounts
 * Lista IG Business accounts via BM (owned_instagram_accounts) e via Pages (instagram_business_account).
 * Deduplica por ID.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphGet } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";

export const runtime = "nodejs";

interface IgAccount {
  id: string;
  username?: string;
  profile_picture_url?: string;
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: conn } = await supabase
    .from("meta_connections")
    .select("access_token_ciphertext, app_secret_ciphertext, business_manager_id, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!conn) return NextResponse.json({ accounts: [] });

  const { token, appSecret } = decryptCredentials(conn);

  const seen = new Map<string, IgAccount>();

  // 1. /{bm_id}/owned_instagram_accounts
  if (conn.business_manager_id) {
    try {
      const r = await graphGet<{ data: IgAccount[] }>(
        token,
        `/${conn.business_manager_id}/owned_instagram_accounts`,
        { fields: "id,username,profile_picture_url", limit: 100 },
        appSecret
      );
      for (const a of r.data ?? []) seen.set(a.id, a);
    } catch {
      // ignora
    }
  }

  // 2. Via Pages → instagram_business_account
  try {
    const pagesRes = await graphGet<{ data: { instagram_business_account?: IgAccount }[] }>(
      token,
      "/me/accounts",
      { fields: "instagram_business_account{id,username,profile_picture_url}", limit: 100 },
      appSecret
    );
    for (const p of pagesRes.data ?? []) {
      if (p.instagram_business_account?.id) {
        seen.set(p.instagram_business_account.id, p.instagram_business_account);
      }
    }
  } catch {
    // ignora
  }

  return NextResponse.json({
    accounts: Array.from(seen.values()).map((a) => ({
      id: a.id,
      username: a.username ?? null,
      profilePictureUrl: a.profile_picture_url ?? null,
    })),
  });
}
