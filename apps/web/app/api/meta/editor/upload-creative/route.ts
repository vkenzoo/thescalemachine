/**
 * POST /api/meta/editor/upload-creative
 * Body: multipart/form-data com `file` + `account_id` (act_xxx)
 *
 * Faz upload de imagem/vídeo pra Meta:
 *   - Imagem: POST /act_xxx/adimages → retorna `image_hash`
 *   - Vídeo:  POST /act_xxx/advideos → retorna `id` (video_id)
 *
 * Vídeos pequenos (< 100MB) usam upload simples; vídeos grandes usariam
 * chunked (start/transfer/finish). MVP: simples até 100MB; chunked é fase 2.
 *
 * Retorna { kind, image_hash | video_id, name, size }.
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decryptCredentials } from "@/lib/meta/conn-credentials";
import { appsecretProof } from "@/lib/meta/graph-client";

export const runtime = "nodejs";
export const maxDuration = 300; // até 5min pra vídeos grandes

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  const accountId = String(form.get("account_id") ?? "");

  if (!file || !accountId) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  // Resolve token + appSecret da conta do user
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
  const proof = appsecretProof(token, appSecret);

  const isVideo = file.type.startsWith("video/");
  const isImage = file.type.startsWith("image/");
  if (!isVideo && !isImage) {
    return NextResponse.json({ error: "unsupported_type", detail: file.type }, { status: 400 });
  }

  try {
    if (isImage) {
      // Multipart pra /act_xxx/adimages
      const fd = new FormData();
      fd.append("access_token", token);
      fd.append("appsecret_proof", proof);
      fd.append("filename", file, file.name);

      const res = await fetch(`${BASE_URL}/${accountId}/adimages`, { method: "POST", body: fd });
      const json = await res.json();
      if (!res.ok || json.error) {
        return NextResponse.json({ error: "meta_error", detail: json.error?.message ?? "upload imagem" }, { status: 502 });
      }
      // Resposta: { images: { <name>: { hash, url } } }
      const images = json.images ?? {};
      const first = images[Object.keys(images)[0]];
      return NextResponse.json({
        kind: "image",
        image_hash: first?.hash,
        url: first?.url,
        name: file.name,
        size: file.size,
      });
    }

    // Vídeo (upload simples)
    const fd = new FormData();
    fd.append("access_token", token);
    fd.append("appsecret_proof", proof);
    fd.append("source", file, file.name);
    fd.append("name", file.name);

    const res = await fetch(`${BASE_URL}/${accountId}/advideos`, { method: "POST", body: fd });
    const json = await res.json();
    if (!res.ok || json.error) {
      return NextResponse.json({ error: "meta_error", detail: json.error?.message ?? "upload vídeo" }, { status: 502 });
    }
    return NextResponse.json({
      kind: "video",
      video_id: json.id,
      name: file.name,
      size: file.size,
    });
  } catch (e: any) {
    return NextResponse.json({ error: "network", detail: e.message }, { status: 502 });
  }
}
