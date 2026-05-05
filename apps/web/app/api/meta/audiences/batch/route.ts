/**
 * POST /api/meta/audiences/batch
 *
 * Body: {
 *   account_id: string;            // act_xxx
 *   retention_keys: string[];      // ["7d","30d","90d"]
 *   ig?: {
 *     account_id: string;
 *     username?: string;
 *     event_keys: string[];        // ['ig_visit', 'ig_engage', ...]
 *   };
 *   fb?: {
 *     page_id: string;
 *     page_name?: string;
 *     event_keys: string[];
 *   };
 *   video?: {
 *     video_ids: { id: string; title?: string }[];
 *     event_keys: string[];        // ['v_3s', 'v_25', ...]
 *     prefix?: string;
 *   };
 *   pixel?: {
 *     pixel_id: string;
 *     event_names: string[];       // ['PageView', 'Lead', ...]
 *     site_url?: string;
 *     site_url_enabled?: boolean;  // se true, cria audience adicional só pro URL
 *   };
 *   lookalike?: {
 *     source_audience_id: string;
 *     source_name?: string;
 *     ratio_keys: string[];        // ['lal_1', 'lal_3', ...]
 *     country?: string;
 *   };
 * }
 *
 * Cria todas as combinações via Marketing API e retorna sucessos + falhas.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { graphPost, GraphError, isInvalidTokenError } from "@/lib/meta/graph-client";
import { decryptCredentials } from "@/lib/meta/conn-credentials";
import {
  buildIgAudience,
  buildFbAudience,
  buildVideoAudience,
  buildPixelAudience,
  buildLookalikeAudience,
} from "@/lib/meta/audience-builders";

export const runtime = "nodejs";

interface BatchBody {
  account_id?: string;
  retention_keys?: string[];
  ig?: { account_id: string; username?: string; event_keys: string[] };
  fb?: { page_id: string; page_name?: string; event_keys: string[] };
  video?: {
    video_ids: { id: string; title?: string }[];
    event_keys: string[];
    prefix?: string;
  };
  pixel?: {
    pixel_id: string;
    event_names: string[];
    site_url?: string;
    site_url_enabled?: boolean;
  };
  lookalike?: {
    source_audience_id: string;
    source_name?: string;
    ratio_keys: string[];
    country?: string;
  };
}

const CHUNK_SIZE = 5; // limite paralelo pra evitar rate limit

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body: BatchBody = await req.json().catch(() => ({}));
  const accountId = body.account_id;
  const retentionKeys = body.retention_keys ?? [];

  if (!accountId) return NextResponse.json({ error: "missing_account_id" }, { status: 400 });
  if (retentionKeys.length === 0) return NextResponse.json({ error: "missing_retention" }, { status: 400 });

  const { data: adAccount } = await supabase
    .from("ad_accounts")
    .select("id, account_id, meta_connections!inner(access_token_ciphertext, app_secret_ciphertext, status)")
    .eq("account_id", accountId)
    .eq("user_id", user.id)
    .single();

  if (!adAccount) return NextResponse.json({ error: "account_not_found" }, { status: 404 });

  const conn = (adAccount as any).meta_connections;
  if (conn.status !== "active") {
    return NextResponse.json({ error: "connection_invalid" }, { status: 400 });
  }

  const { token, appSecret } = decryptCredentials(conn);

  // Monta lista de payloads
  const payloads: { kind: string; payload: any }[] = [];

  // IG
  if (body.ig && body.ig.event_keys.length > 0) {
    for (const ek of body.ig.event_keys) {
      for (const rk of retentionKeys) {
        try {
          payloads.push({
            kind: "ig",
            payload: buildIgAudience({
              igAccountId: body.ig.account_id,
              igUsername: body.ig.username,
              eventKey: ek,
              retentionKey: rk,
            }),
          });
        } catch (e: any) {
          // ignora keys inválidas
        }
      }
    }
  }

  // FB
  if (body.fb && body.fb.event_keys.length > 0) {
    for (const ek of body.fb.event_keys) {
      for (const rk of retentionKeys) {
        try {
          payloads.push({
            kind: "fb",
            payload: buildFbAudience({
              pageId: body.fb.page_id,
              pageName: body.fb.page_name,
              eventKey: ek,
              retentionKey: rk,
            }),
          });
        } catch (e: any) {}
      }
    }
  }

  // Video
  if (body.video && body.video.event_keys.length > 0 && body.video.video_ids.length > 0) {
    for (const v of body.video.video_ids) {
      for (const ek of body.video.event_keys) {
        for (const rk of retentionKeys) {
          try {
            payloads.push({
              kind: "video",
              payload: buildVideoAudience({
                videoId: v.id,
                videoTitle: v.title,
                eventKey: ek,
                retentionKey: rk,
                prefix: body.video.prefix,
              }),
            });
          } catch (e: any) {}
        }
      }
    }
  }

  // Pixel events (Website)
  if (body.pixel && body.pixel.event_names.length > 0) {
    for (const ev of body.pixel.event_names) {
      for (const rk of retentionKeys) {
        payloads.push({
          kind: "pixel",
          payload: buildPixelAudience({
            pixelId: body.pixel.pixel_id,
            eventName: ev,
            retentionKey: rk,
          }),
        });
      }
    }
    // Public URL adicional (se habilitado)
    if (body.pixel.site_url_enabled && body.pixel.site_url) {
      for (const rk of retentionKeys) {
        payloads.push({
          kind: "pixel",
          payload: buildPixelAudience({
            pixelId: body.pixel.pixel_id,
            eventName: "PageView",
            retentionKey: rk,
            url: body.pixel.site_url,
          }),
        });
      }
    }
  }

  // Lookalike
  if (body.lookalike && body.lookalike.ratio_keys.length > 0) {
    for (const rk of body.lookalike.ratio_keys) {
      try {
        payloads.push({
          kind: "lookalike",
          payload: buildLookalikeAudience({
            sourceAudienceId: body.lookalike.source_audience_id,
            sourceName: body.lookalike.source_name,
            ratioKey: rk,
            country: body.lookalike.country,
          }),
        });
      } catch (e: any) {}
    }
  }

  if (payloads.length === 0) {
    return NextResponse.json({ error: "nothing_to_create", message: "Nenhum público pra criar." }, { status: 400 });
  }

  // Executa em chunks paralelos
  const created: { id: string; name: string; kind: string }[] = [];
  const failed: { name: string; kind: string; message: string }[] = [];

  for (let i = 0; i < payloads.length; i += CHUNK_SIZE) {
    const chunk = payloads.slice(i, i + CHUNK_SIZE);
    const results = await Promise.allSettled(
      chunk.map(async ({ kind, payload }) => {
        const res = await graphPost<{ id: string }>(
          token,
          `/${adAccount.account_id}/customaudiences`,
          payload,
          appSecret
        );
        return { kind, id: res.id, name: payload.name as string };
      })
    );
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      const original = chunk[j];
      if (r.status === "fulfilled") {
        created.push({ id: r.value.id, name: r.value.name, kind: r.value.kind });
      } else {
        const reason = r.reason;
        if (isInvalidTokenError(reason)) {
          await supabase.from("meta_connections").update({ status: "invalid" }).eq("user_id", user.id);
          return NextResponse.json({ error: "token_invalid" }, { status: 401 });
        }
        const msg =
          reason instanceof GraphError
            ? `${reason.code}: ${reason.message}`
            : (reason as Error)?.message ?? "erro desconhecido";
        failed.push({ kind: original.kind, name: original.payload.name, message: msg });
      }
    }
  }

  return NextResponse.json({
    ok: true,
    total: payloads.length,
    created_count: created.length,
    failed_count: failed.length,
    created,
    failed,
  });
}
