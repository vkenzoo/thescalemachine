import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { GatewayParser, ParserOutput } from "./types";

/**
 * Kiwify webhook
 * Auth: query `?signature=...` (HMAC-SHA1 do body com signing_secret).
 * Idempotência: webhook_event_id.
 */

const STATUS_MAP: Record<string, string> = {
  paid: "approved",
  approved: "approved",
  refunded: "refunded",
  chargedback: "chargedback",
  refused: "refused",
  waiting_payment: "pending",
  pending: "pending",
};

export const kiwifyParser: GatewayParser = {
  verifySignature({ rawBody, headers, signingSecret }) {
    if (!signingSecret) return false;
    // Kiwify pode mandar signature no header OU em query string. Tratamos ambos.
    const sigFromHeader = headers["x-kiwify-signature"] ?? headers["signature"];
    if (!sigFromHeader) return false;
    const expected = createHmac("sha1", signingSecret).update(rawBody).digest("hex");
    try {
      const a = Buffer.from(expected);
      const b = Buffer.from(String(sigFromHeader));
      return a.length === b.length && timingSafeEqual(a, b);
    } catch {
      return false;
    }
  },

  parse(payload: any): ParserOutput {
    const eventType = payload?.webhook_event_type ?? payload?.event ?? "unknown";
    const orderId = payload?.order_id ?? payload?.id;
    if (!orderId) return { ok: false, error: "missing_order_id" };

    const status = String(payload?.order_status ?? payload?.status ?? "unknown").toLowerCase();
    const occurred_at = payload?.created_at
      ? new Date(payload.created_at).toISOString()
      : new Date().toISOString();

    const product = payload?.Product ?? payload?.product ?? {};
    const customer = payload?.Customer ?? payload?.customer ?? {};
    const commissions = payload?.Commissions ?? payload?.commissions ?? {};
    const tracking = payload?.TrackingParameters ?? payload?.tracking_parameters ?? {};

    const gross_value_cents = commissions?.charge_amount ?? null;
    const fee_cents = commissions?.kiwify_fee ?? null;
    const net_value_cents = commissions?.my_commission ?? null;
    const currency = commissions?.currency ?? "BRL";

    const buyer_email_hash = customer.email
      ? createHash("sha256").update(String(customer.email).toLowerCase().trim()).digest("hex")
      : null;

    return {
      ok: true,
      sale: {
        event_type: eventType.toLowerCase(),
        external_transaction_id: String(orderId),
        external_event_id: payload?.webhook_event_id ?? `${orderId}_${eventType}_${occurred_at}`,
        occurred_at,
        status: STATUS_MAP[status] ?? status,
        gross_value_cents,
        net_value_cents,
        fee_cents,
        currency,
        utm_source: tracking.utm_source ?? null,
        utm_medium: tracking.utm_medium ?? null,
        utm_campaign: tracking.utm_campaign ?? null,
        utm_content: tracking.utm_content ?? null,
        utm_term: tracking.utm_term ?? null,
        utm_id: tracking.utm_id ?? null,
        src: tracking.src ?? null,
        sck: tracking.sck ?? null,
        xcode: null,
        external_product_id: product.product_id ? String(product.product_id) : null,
        product_name: product.product_name ?? null,
        buyer_email_hash,
        buyer_country: customer.country ?? null,
      },
    };
  },
};
