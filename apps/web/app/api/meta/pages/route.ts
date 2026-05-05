/**
 * GET /api/meta/pages
 *
 * Lista Facebook Pages que o user tem acesso (System User precisa ter sido
 * atribuído como Admin/Editor das Pages no BM).
 *
 * Estratégia:
 *  1. Tenta /me/accounts (lista direta de pages do user)
 *  2. Se vazio, tenta /{bm_id}/owned_pages (pages do BM atribuídas ao System User)
 *
 * Retorna IG Business linkada de cada Page também (pra criação de IG Engagement audience).
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphGet } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";

export const runtime = "nodejs";

interface MetaPage {
  id: string;
  name: string;
  category?: string;
  instagram_business_account?: { id: string; username?: string };
  access_token?: string;
}

export async function GET(_req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  // Pega connection ativa (Pages são por user, não por ad account)
  const { data: conn } = await supabase
    .from("meta_connections")
    .select("access_token_ciphertext, app_secret_ciphertext, business_manager_id, status")
    .eq("user_id", user.id)
    .eq("status", "active")
    .limit(1)
    .maybeSingle();

  if (!conn) return NextResponse.json({ pages: [] });

  const { token, appSecret } = decryptCredentials(conn);

  // 1. /me/accounts
  let pages: MetaPage[] = [];
  try {
    const meRes = await graphGet<{ data: MetaPage[] }>(
      token,
      "/me/accounts",
      {
        fields: "id,name,category,instagram_business_account{id,username}",
        limit: 100,
      },
      appSecret
    );
    pages = meRes.data ?? [];
  } catch {
    // ignora — vai tentar fallback
  }

  // 2. Se vazio, tenta /{bm_id}/owned_pages
  if (pages.length === 0 && conn.business_manager_id) {
    try {
      const bmRes = await graphGet<{ data: MetaPage[] }>(
        token,
        `/${conn.business_manager_id}/owned_pages`,
        {
          fields: "id,name,category,instagram_business_account{id,username}",
          limit: 100,
        },
        appSecret
      );
      pages = bmRes.data ?? [];
    } catch {
      // se ambos falham, retorna vazio
    }
  }

  return NextResponse.json({
    pages: pages.map((p) => ({
      id: p.id,
      name: p.name,
      category: p.category ?? null,
      instagramId: p.instagram_business_account?.id ?? null,
      instagramUsername: p.instagram_business_account?.username ?? null,
    })),
  });
}
