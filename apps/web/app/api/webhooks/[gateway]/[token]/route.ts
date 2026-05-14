/**
 * POST /api/webhooks/{gateway}/{token}
 *
 * URL única gerada na página /integracoes. Cada projeto UTM tem um token UUID.
 * Resolve token → projeto → user_id → gateway, valida HMAC, normaliza payload,
 * grava em utm_sales_raw, dispara resolver fire-and-forget. Retorna 200 < 500ms.
 *
 * Service role (bypass RLS) — webhooks não têm cookie.
 */

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { decrypt } from "@/lib/crypto";
import { PARSERS } from "@/lib/utm/parsers";
import { resolveSaleAttribution, persistAttribution } from "@/lib/utm/attribution";
import { logError, logEvent } from "@/lib/audit";

export const runtime = "nodejs";
export const maxDuration = 30;

export async function POST(
  req: NextRequest,
  { params }: { params: { gateway: string; token: string } }
) {
  const gateway = params.gateway?.toLowerCase();
  const token = params.token;

  const parser = PARSERS[gateway];
  if (!parser) {
    return NextResponse.json({ error: "unknown_gateway" }, { status: 404 });
  }

  const supabase = createAdminClient();

  // 1. Resolve projeto pelo token
  const { data: project, error: projErr } = await supabase
    .from("utm_projects")
    .select("id,user_id,platform,signing_secret_ciphertext")
    .eq("webhook_token", token)
    .maybeSingle();

  if (projErr || !project) {
    return NextResponse.json({ error: "unknown_token" }, { status: 404 });
  }
  if (project.platform !== gateway) {
    return NextResponse.json({ error: "wrong_gateway" }, { status: 400 });
  }

  // 2. Lê body cru e parsa JSON
  const rawBody = await req.text();
  let payload: any;
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  // 3. Verifica assinatura
  const headers: Record<string, string> = {};
  req.headers.forEach((v, k) => { headers[k.toLowerCase()] = v; });
  const signingSecret = project.signing_secret_ciphertext ? decrypt(project.signing_secret_ciphertext) : null;

  if (!parser.verifySignature({ rawBody, headers, signingSecret })) {
    return NextResponse.json({ error: "invalid_signature" }, { status: 401 });
  }

  // 4. Normaliza
  const parsed = parser.parse(payload);
  if (!parsed.ok) {
    return NextResponse.json({ error: parsed.error, detail: parsed.detail }, { status: 400 });
  }
  const sale = parsed.sale;

  // 5. Insere sales_raw (idempotente via UNIQUE project_id+event_id)
  const { data: inserted, error: insertErr } = await supabase
    .from("utm_sales_raw")
    .upsert({
      user_id: project.user_id,
      project_id: project.id,
      gateway,
      event_type: sale.event_type,
      external_transaction_id: sale.external_transaction_id,
      external_event_id: sale.external_event_id,
      occurred_at: sale.occurred_at,
      status: sale.status,
      gross_value_cents: sale.gross_value_cents,
      net_value_cents: sale.net_value_cents,
      fee_cents: sale.fee_cents,
      currency: sale.currency,
      utm_source: sale.utm_source,
      utm_medium: sale.utm_medium,
      utm_campaign: sale.utm_campaign,
      utm_content: sale.utm_content,
      utm_term: sale.utm_term,
      utm_id: sale.utm_id,
      src: sale.src,
      sck: sale.sck,
      xcode: sale.xcode,
      external_product_id: sale.external_product_id,
      product_name: sale.product_name,
      buyer_email_hash: sale.buyer_email_hash,
      buyer_country: sale.buyer_country,
      raw: payload,
    }, { onConflict: "project_id,external_event_id" })
    .select("id")
    .single();

  if (insertErr || !inserted) {
    console.error("[webhook] insert failed:", insertErr?.message);
    logError(insertErr, {
      area: "webhook",
      tags: { gateway },
      extra: { event_type: sale.event_type, transaction_id: sale.external_transaction_id },
    });
    return NextResponse.json({ error: "db_error", detail: insertErr?.message }, { status: 500 });
  }

  // 6. Atualiza last_event_at + flag webhook_configured
  await supabase.from("utm_projects").update({
    last_event_at: new Date().toISOString(),
    webhook_configured: true,
  }).eq("id", project.id);

  // 7. Refund/chargeback: marca atribuição original como inativa
  if (sale.status === "refunded" || sale.status === "chargedback") {
    const { data: originals } = await supabase
      .from("utm_sales_raw")
      .select("id")
      .eq("user_id", project.user_id)
      .eq("external_transaction_id", sale.external_transaction_id)
      .eq("status", "approved");
    const originalIds = (originals ?? []).map((s: any) => s.id);
    if (originalIds.length > 0) {
      await supabase.from("utm_sales_attribution")
        .update({ is_active: false, inactive_reason: sale.status, inactive_at: new Date().toISOString() })
        .in("sale_id", originalIds);
    }
  }

  // 8. Resolve atribuição em fire-and-forget
  resolveSaleAttribution(supabase, {
    id: inserted.id,
    user_id: project.user_id,
    utm_campaign: sale.utm_campaign,
    utm_content: sale.utm_content,
    utm_term: sale.utm_term,
    utm_id: sale.utm_id,
  }).then((result) => persistAttribution(supabase, inserted.id, project.user_id, result))
    .catch((e) => {
      console.error("[webhook] attribution failed:", e?.message);
      logError(e, {
        area: "resolver",
        tags: { gateway },
        userId: project.user_id,
        extra: { sale_id: inserted.id },
      });
    });

  return NextResponse.json({ ok: true, sale_id: inserted.id });
}
