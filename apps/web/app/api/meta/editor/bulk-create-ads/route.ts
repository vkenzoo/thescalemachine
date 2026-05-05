/**
 * POST /api/meta/editor/bulk-create-ads
 * Body: {
 *   account_id: 'act_xxx',
 *   adset_ids: string[],         // meta IDs dos conjuntos onde criar ads
 *   creatives: Array<{           // criativos já uploadados
 *     image_hash?: string;
 *     video_id?: string;
 *     ad_name: string;           // nome do ad
 *   }>,
 *   creative_template: {
 *     headline?: string;         // título / message
 *     body?: string;             // descrição
 *     link_url: string;          // landing page do anúncio
 *     call_to_action?: string;   // 'SHOP_NOW' | 'SIGN_UP' | etc.
 *     page_id?: string;          // FB page (obrigatório pra link ads)
 *   },
 *   active: boolean              // criar como ACTIVE ou PAUSED
 * }
 *
 * Pra cada combinação (adset, creative): cria AdCreative + Ad.
 * Retorna agregação { success, failed, total, errors[], created_ads[] }.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphPost, isInvalidTokenError } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";

export const runtime = "nodejs";
export const maxDuration = 300;

interface CreativeInput {
  image_hash?: string;
  video_id?: string;
  ad_name: string;
}

interface CreativeTemplate {
  headline?: string;
  body?: string;
  link_url: string;
  call_to_action?: string;
  page_id?: string;
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const accountId: string = body.account_id;
  const adsetIds: string[] = Array.isArray(body.adset_ids) ? body.adset_ids : [];
  const creatives: CreativeInput[] = Array.isArray(body.creatives) ? body.creatives : [];
  const tmpl: CreativeTemplate = body.creative_template ?? {};
  const active: boolean = body.active === true;

  if (!accountId || adsetIds.length === 0 || creatives.length === 0) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }
  if (!tmpl.link_url) {
    return NextResponse.json({ error: "missing_link_url" }, { status: 400 });
  }

  // Resolve token
  const { data: acc } = await supabase
    .from("ad_accounts")
    .select("account_id,meta_connections!inner(access_token_ciphertext,app_secret_ciphertext,status)")
    .eq("user_id", user.id)
    .eq("account_id", accountId)
    .maybeSingle();

  if (!acc) return NextResponse.json({ error: "account_not_found" }, { status: 404 });
  const conn = (acc as any).meta_connections;
  if (conn.status !== "active") return NextResponse.json({ error: "connection_invalid" }, { status: 400 });
  const { token, appSecret } = decryptCredentials(conn);

  // Resolve page_id se não veio (default = 1ª page do user)
  let pageId = tmpl.page_id;
  if (!pageId) {
    const { data: page } = await supabase
      .from("meta_pages")
      .select("page_id")
      .eq("user_id", user.id)
      .limit(1)
      .maybeSingle();
    pageId = page?.page_id;
  }
  if (!pageId) {
    return NextResponse.json({
      error: "no_page",
      detail: "Nenhuma página Facebook conectada. Sincronize páginas em /connect ou passe page_id.",
    }, { status: 400 });
  }

  let success = 0;
  let failed = 0;
  const errors: Array<{ context: string; message: string }> = [];
  const createdAds: Array<{ ad_id: string; adset_id: string; name: string }> = [];

  // Total de combinações
  const total = adsetIds.length * creatives.length;

  // Pra cada combinação: cria creative + ad. Em chunks de 5 paralelo.
  const tasks: Array<{ adsetId: string; creative: CreativeInput }> = [];
  for (const adsetId of adsetIds) for (const c of creatives) tasks.push({ adsetId, creative: c });

  for (let i = 0; i < tasks.length; i += 5) {
    const chunk = tasks.slice(i, i + 5);
    const results = await Promise.allSettled(chunk.map(async (t) => {
      // 1. Cria AdCreative
      const creativeBody = buildCreativeBody({
        creative: t.creative,
        tmpl,
        pageId: pageId!,
      });
      const creativeRes = await graphPost<{ id: string }>(
        token, `/${accountId}/adcreatives`, creativeBody, appSecret
      );
      const creativeId = creativeRes.id;

      // 2. Cria Ad
      const adRes = await graphPost<{ id: string }>(
        token, `/${accountId}/ads`,
        {
          name: t.creative.ad_name,
          adset_id: t.adsetId,
          creative: JSON.stringify({ creative_id: creativeId }),
          status: active ? "ACTIVE" : "PAUSED",
        },
        appSecret
      );

      return { ad_id: adRes.id, adset_id: t.adsetId, name: t.creative.ad_name };
    }));

    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const t = chunk[j];
      if (r.status === "fulfilled") {
        success++;
        createdAds.push(r.value);
      } else {
        failed++;
        const err: any = r.reason;
        if (isInvalidTokenError(err)) {
          await supabase.from("meta_connections").update({ status: "invalid" })
            .eq("user_id", user.id);
        }
        errors.push({
          context: `adset=${t.adsetId} ad=${t.creative.ad_name}`,
          message: err?.message ?? "Erro desconhecido",
        });
      }
    }
  }

  return NextResponse.json({
    ok: failed === 0,
    total,
    success,
    failed,
    created_ads: createdAds,
    errors: errors.slice(0, 20),
  });
}

function buildCreativeBody({
  creative, tmpl, pageId,
}: {
  creative: CreativeInput;
  tmpl: CreativeTemplate;
  pageId: string;
}): Record<string, any> {
  const objectStorySpec: any = {
    page_id: pageId,
  };

  const linkData: any = {
    link: tmpl.link_url,
    message: tmpl.body ?? "",
    name: tmpl.headline ?? "",
  };
  if (tmpl.call_to_action) {
    linkData.call_to_action = { type: tmpl.call_to_action, value: { link: tmpl.link_url } };
  }

  if (creative.video_id) {
    objectStorySpec.video_data = {
      video_id: creative.video_id,
      message: tmpl.body ?? "",
      title: tmpl.headline ?? "",
      call_to_action: tmpl.call_to_action ? { type: tmpl.call_to_action, value: { link: tmpl.link_url } } : undefined,
    };
  } else if (creative.image_hash) {
    objectStorySpec.link_data = {
      ...linkData,
      image_hash: creative.image_hash,
    };
  } else {
    throw new Error("Creative sem image_hash nem video_id");
  }

  return {
    name: `Creative — ${creative.ad_name}`,
    object_story_spec: JSON.stringify(objectStorySpec),
  };
}
