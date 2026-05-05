import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { GatewayParser, ParserOutput } from "./types";

/**
 * Assiny webhook
 * Auth: header 'x-assiny-signature' (HMAC-SHA256 do body) ou token query.
 * UTMs vêm em data.metadata.utm_* E/OU data.metadata.url_parameters.*.
 */

const STATUS_MAP: Record<string, string> = {
  approved: "approved",
  paid: "approved",
  refunded: "refunded",
  chargedback: "chargedback",
  abandoned: "abandoned",
  pending: "pending",
  failed: "refused",
};

export const assinyParser: GatewayParser = {
  verifySignature({ rawBody, headers, signingSecret }) {
    if (!signingSecret) return false;
    const sig = headers["x-assiny-signature"] ?? headers["x-signature"];
    if (sig) {
      const expected = createHmac("sha256", signingSecret).update(rawBody).digest("hex");
      try {
        const a = Buffer.from(expected);
        const b = Buffer.from(String(sig));
        return a.length === b.length && timingSafeEqual(a, b);
      } catch { return false; }
    }
    // Fallback: token simples
    const token = headers["x-assiny-token"];
    return token === signingSecret;
  },

  parse(payload: any): ParserOutput {
    const event = payload?.event ?? "unknown";
    const data = payload?.data ?? {};
    const offer = data.offer ?? {};
    const client = data.client ?? {};
    const metadata = data.metadata ?? {};
    const urlParams = metadata.url_parameters ?? {};

    const transaction_id = data.transaction_id ?? data.id ?? `assiny-${event}-${Date.now()}`;

    const status = String(data.status ?? event ?? "unknown").toLowerCase();
    const occurred_at = data.created_at ? new Date(data.created_at).toISOString() : new Date().toISOString();

    const buyer_email_hash = client.email
      ? createHash("sha256").update(String(client.email).toLowerCase().trim()).digest("hex")
      : null;

    return {
      ok: true,
      sale: {
        event_type: String(event).toLowerCase(),
        external_transaction_id: String(transaction_id),
        external_event_id: payload?.id ?? data.id ?? `${transaction_id}_${event}`,
        occurred_at,
        status: STATUS_MAP[status] ?? status,
        gross_value_cents: offer.price_cents ?? null,
        net_value_cents: null,
        fee_cents: null,
        currency: offer.currency ?? "BRL",
        utm_source: metadata.utm_source ?? urlParams.utm_source ?? null,
        utm_medium: metadata.utm_medium ?? urlParams.utm_medium ?? null,
        utm_campaign: metadata.utm_campaign ?? urlParams.utm_campaign ?? null,
        utm_content: metadata.utm_content ?? urlParams.utm_content ?? null,
        utm_term: metadata.utm_term ?? urlParams.utm_term ?? null,
        utm_id: metadata.utm_id ?? urlParams.utm_id ?? null,
        src: metadata.src ?? urlParams.src ?? null,
        sck: metadata.sck ?? urlParams.sck ?? null,
        xcode: null,
        external_product_id: offer.id ? String(offer.id) : null,
        product_name: offer.name ?? null,
        buyer_email_hash,
        buyer_country: client.country ?? null,
      },
    };
  },
};
