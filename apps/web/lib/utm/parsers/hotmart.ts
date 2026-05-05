import { createHash } from "node:crypto";
import type { GatewayParser, ParserOutput } from "./types";

/**
 * Hotmart Webhook 2.0.0
 * Auth: header `X-Hotmart-Hottok` = signing_secret cadastrado no produto.
 * Idempotência: campo `id` no envelope.
 */

const STATUS_MAP: Record<string, string> = {
  PURCHASE_APPROVED: "approved",
  PURCHASE_COMPLETE: "approved",
  PURCHASE_BILLET_PRINTED: "pending",
  PURCHASE_REFUNDED: "refunded",
  PURCHASE_CHARGEBACK: "chargedback",
  PURCHASE_CANCELED: "canceled",
  PURCHASE_PROTEST: "disputed",
  PURCHASE_DELAYED: "pending",
  PURCHASE_EXPIRED: "expired",
};

export const hotmartParser: GatewayParser = {
  verifySignature({ headers, signingSecret }) {
    if (!signingSecret) return false;
    const hottok = headers["x-hotmart-hottok"];
    return hottok === signingSecret;
  },

  parse(payload: any): ParserOutput {
    const event = payload?.event;
    const data = payload?.data;
    if (!event || !data) return { ok: false, error: "invalid_payload" };

    const purchase = data.purchase ?? {};
    const product = data.product ?? {};
    const buyer = data.buyer ?? {};
    const tracking = purchase.tracking ?? {};

    const occurredMs = purchase.order_date ?? purchase.approved_date ?? payload.creation_date ?? Date.now();
    const occurred_at = new Date(typeof occurredMs === "number" ? occurredMs : Date.parse(occurredMs)).toISOString();

    const priceValue = purchase.price?.value ?? purchase.full_price?.value ?? null;
    const gross_value_cents = priceValue != null ? Math.round(parseFloat(String(priceValue)) * 100) : null;
    const currency = purchase.price?.currency_value ?? purchase.full_price?.currency_value ?? "BRL";

    const external_event_id =
      payload.id ??
      `${purchase.transaction ?? "no-tx"}_${event}_${occurredMs}_${createHash("sha1").update(JSON.stringify(payload)).digest("hex").slice(0, 8)}`;

    const buyer_email_hash = buyer.email
      ? createHash("sha256").update(String(buyer.email).toLowerCase().trim()).digest("hex")
      : null;

    return {
      ok: true,
      sale: {
        event_type: event.toLowerCase(),
        external_transaction_id: purchase.transaction ?? "",
        external_event_id,
        occurred_at,
        status: STATUS_MAP[event] ?? "unknown",
        gross_value_cents,
        net_value_cents: null,
        fee_cents: null,
        currency,
        utm_source: tracking.source ?? tracking.utm_source ?? null,
        utm_medium: tracking.utm_medium ?? null,
        utm_campaign: tracking.utm_campaign ?? null,
        utm_content: tracking.utm_content ?? null,
        utm_term: tracking.utm_term ?? null,
        utm_id: tracking.utm_id ?? null,
        src: tracking.source_sck ?? tracking.src ?? null,
        sck: tracking.sck ?? null,
        xcode: tracking.external_code ?? null,
        external_product_id: product.id != null ? String(product.id) : (product.ucode ?? null),
        product_name: product.name ?? null,
        buyer_email_hash,
        buyer_country: purchase.checkout_country?.iso ?? buyer.address?.country ?? null,
      },
    };
  },
};
