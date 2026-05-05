/**
 * POST /api/integracoes/test-webhook
 * Body: { project_id: string }
 *
 * Monta um payload de teste no formato do gateway do projeto, assina com o
 * signing_secret real, bate no próprio webhook, espera 1.2s pro resolver,
 * e devolve o resultado completo (sale + atribuição).
 *
 * Tenta usar um anúncio real do user (se houver Meta sincronizado) pra gerar
 * match 100% confiança. Senão, cai pra IDs sintéticos (resultado: "direct").
 */

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { decrypt } from "@/lib/crypto";
import { createHmac, randomUUID } from "node:crypto";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const projectId = String(body.project_id ?? "");
  if (!projectId) return NextResponse.json({ error: "missing_project_id" }, { status: 400 });

  // Resolve projeto (RLS garante que é do user)
  const { data: project } = await supabase
    .from("utm_projects")
    .select("id,platform,webhook_token,signing_secret_ciphertext,ad_account_id")
    .eq("id", projectId)
    .maybeSingle();

  if (!project) return NextResponse.json({ error: "project_not_found" }, { status: 404 });
  if (!project.signing_secret_ciphertext) {
    return NextResponse.json({ error: "no_secret", detail: "Cadastre o Hottok / signing secret antes." }, { status: 400 });
  }
  const signingSecret = decrypt(project.signing_secret_ciphertext);

  // Pega 1 ad real do user (se possível, da ad_account vinculada)
  let metaCampaignId: string | null = null;
  let metaAdId: string | null = null;
  let realCampaignName: string | null = null;
  let realAdName: string | null = null;

  let q = supabase
    .from("ads")
    .select("meta_id,name,adsets!inner(campaign_id,campaigns!inner(meta_id,name,ad_account_id))")
    .eq("user_id", user.id)
    .limit(1);

  if (project.ad_account_id) {
    q = q.eq("adsets.campaigns.ad_account_id", project.ad_account_id);
  }
  const { data: anyAd } = await q.maybeSingle();
  if (anyAd) {
    metaAdId = (anyAd as any).meta_id;
    realAdName = (anyAd as any).name;
    metaCampaignId = (anyAd as any).adsets?.campaigns?.meta_id;
    realCampaignName = (anyAd as any).adsets?.campaigns?.name;
  }

  const usedRealIds = !!(metaAdId && metaCampaignId);

  // Monta payload + headers de auth conforme gateway
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? new URL(req.url).origin;
  const webhookUrl = `${baseUrl}/api/webhooks/${project.platform}/${project.webhook_token}`;

  const eventId = randomUUID();
  const txId = `TEST-${Date.now()}`;
  const utm_campaign = realCampaignName && metaCampaignId ? `${realCampaignName}|${metaCampaignId}` : metaCampaignId ?? "test-campaign";
  const utm_term = metaAdId ?? "test-ad";

  let payloadStr = "";
  let headers: Record<string, string> = { "Content-Type": "application/json" };

  if (project.platform === "hotmart") {
    const payload = {
      id: eventId,
      event: "PURCHASE_APPROVED",
      version: "2.0.0",
      creation_date: Date.now(),
      data: {
        product: { id: "999000", name: "Produto de Teste" },
        purchase: {
          transaction: txId,
          order_date: Date.now(),
          approved_date: Date.now(),
          status: "APPROVED",
          price: { value: 197.0, currency_value: "BRL" },
          full_price: { value: 197.0, currency_value: "BRL" },
          payment: { method: "CREDIT_CARD" },
          checkout_country: { iso: "BR" },
          tracking: {
            source: "fb",
            utm_source: "fb",
            utm_medium: "paid",
            utm_campaign,
            utm_content: "test-adset",
            utm_term,
          },
        },
        buyer: { email: "teste@adseditor.com.br", name: "Comprador Teste" },
      },
    };
    payloadStr = JSON.stringify(payload);
    headers["X-Hotmart-Hottok"] = signingSecret;

  } else if (project.platform === "kiwify") {
    const payload = {
      webhook_event_id: eventId,
      webhook_event_type: "order_approved",
      order_id: txId,
      order_status: "paid",
      created_at: new Date().toISOString(),
      Product: { product_id: "K-999", product_name: "Produto de Teste" },
      Customer: { email: "teste@adseditor.com.br", full_name: "Comprador Teste", country: "BR" },
      Commissions: { charge_amount: 19700, kiwify_fee: 1500, my_commission: 18200, currency: "BRL" },
      TrackingParameters: {
        utm_source: "fb", utm_medium: "paid",
        utm_campaign, utm_content: "test-adset", utm_term,
      },
    };
    payloadStr = JSON.stringify(payload);
    headers["x-kiwify-signature"] = createHmac("sha1", signingSecret).update(payloadStr).digest("hex");

  } else if (project.platform === "hubla") {
    const payload = {
      type: "invoice.payment_succeeded",
      version: 2,
      event: {
        invoice: {
          id: txId,
          status: "paid",
          paidAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          amount: { totalCents: 19700, netCents: 18200, feeCents: 1500, currency: "BRL" },
          metadata: {
            utm_source: "fb", utm_medium: "paid",
            utm_campaign, utm_content: "test-adset", utm_term,
          },
        },
        product: { id: "H-999", name: "Produto de Teste" },
        user: { email: "teste@adseditor.com.br", firstName: "Comprador" },
      },
    };
    payloadStr = JSON.stringify(payload);
    headers["x-hubla-token"] = signingSecret;

  } else if (project.platform === "assiny") {
    const payload = {
      id: eventId,
      event: "purchase.approved",
      data: {
        transaction_id: txId,
        status: "approved",
        created_at: new Date().toISOString(),
        offer: { id: "A-999", name: "Produto de Teste", price_cents: 19700, currency: "BRL" },
        client: { email: "teste@adseditor.com.br", name: "Comprador Teste", country: "BR" },
        metadata: {
          utm_source: "fb", utm_medium: "paid",
          utm_campaign, utm_content: "test-adset", utm_term,
        },
      },
    };
    payloadStr = JSON.stringify(payload);
    headers["x-assiny-signature"] = createHmac("sha256", signingSecret).update(payloadStr).digest("hex");

  } else {
    return NextResponse.json({ error: "unsupported_platform" }, { status: 400 });
  }

  // Bate no próprio webhook
  const start = Date.now();
  const res = await fetch(webhookUrl, { method: "POST", headers, body: payloadStr });
  const elapsed_ms = Date.now() - start;
  const webhookJson = await res.json().catch(() => ({}));

  // Espera resolver rodar
  await new Promise((r) => setTimeout(r, 1200));

  let attribution: any = null;
  if (webhookJson.sale_id) {
    const { data } = await supabase
      .from("utm_sales_attribution")
      .select("matched,match_method,match_confidence,ad_id,campaign_id")
      .eq("sale_id", webhookJson.sale_id)
      .maybeSingle();
    attribution = data;
  }

  return NextResponse.json({
    ok: res.ok,
    webhook_status: res.status,
    webhook_response: webhookJson,
    elapsed_ms,
    used_real_ids: usedRealIds,
    test_payload: {
      transaction: txId,
      utm_campaign, utm_term,
      ad_name: realAdName,
      campaign_name: realCampaignName,
    },
    attribution,
  });
}
