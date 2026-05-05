import { createHash, createHmac, timingSafeEqual } from "node:crypto";
import type { GatewayParser, ParserOutput } from "./types";

/**
 * Hubla webhook
 * Auth: header `x-hubla-token` = signing_secret OU `x-hubla-hmac-sha256`.
 * Idempotência: header `x-hubla-idempotency` ou event id.
 */

const STATUS_MAP: Record<string, string> = {
  paid: "approved",
  succeeded: "approved",
  approved: "approved",
  refunded: "refunded",
  chargedback: "chargedback",
  pending: "pending",
  failed: "refused",
  canceled: "canceled",
};

export const hublaParser: GatewayParser = {
  verifySignature({ rawBody, headers, signingSecret }) {
    if (!signingSecret) return false;
    // Caminho 1: token simples
    const tokenHeader = headers["x-hubla-token"];
    if (tokenHeader && tokenHeader === signingSecret) return true;

    // Caminho 2: HMAC SHA256 do body
    const hmacHeader = headers["x-hubla-hmac-sha256"];
    if (hmacHeader) {
      const expected = createHmac("sha256", signingSecret).update(rawBody).digest("hex");
      try {
        const a = Buffer.from(expected);
        const b = Buffer.from(String(hmacHeader));
        return a.length === b.length && timingSafeEqual(a, b);
      } catch { return false; }
    }
    return false;
  },

  parse(payload: any): ParserOutput {
    const type = payload?.type ?? payload?.event ?? "unknown";
    // Hubla evolução: campos podem estar em event.*  (novo) ou root (antigo)
    const root = payload?.event ?? payload;
    const invoice = root?.invoice ?? root?.event?.invoice ?? {};
    const product = root?.product ?? {};
    const user = root?.user ?? root?.customer ?? {};
    const subscription = root?.subscription ?? null;
    const metadata = invoice?.metadata ?? root?.metadata ?? {};

    const transaction_id = invoice?.id ?? root?.id ?? "";
    if (!transaction_id) return { ok: false, error: "missing_transaction_id" };

    const status = String(invoice?.status ?? root?.status ?? type ?? "unknown").toLowerCase();
    const occurred_at = invoice?.paidAt ?? invoice?.createdAt ?? root?.createdAt ?? new Date().toISOString();

    const amount = invoice?.amount ?? {};
    const gross_value_cents = amount.totalCents ?? null;
    const net_value_cents = amount.netCents ?? null;
    const fee_cents = amount.feeCents ?? null;
    const currency = amount.currency ?? "BRL";

    // UTMs podem estar em metadata.utm_* ou em metadata.url_parameters.*
    const utm = metadata.url_parameters ?? metadata;

    const buyer_email_hash = user.email
      ? createHash("sha256").update(String(user.email).toLowerCase().trim()).digest("hex")
      : null;

    return {
      ok: true,
      sale: {
        event_type: String(type).toLowerCase(),
        external_transaction_id: String(transaction_id),
        external_event_id: payload?.id ?? root?.id ?? `${transaction_id}_${type}`,
        occurred_at: typeof occurred_at === "string" ? occurred_at : new Date(occurred_at).toISOString(),
        status: STATUS_MAP[status] ?? status,
        gross_value_cents,
        net_value_cents,
        fee_cents,
        currency,
        utm_source: utm.utm_source ?? metadata.utm_source ?? null,
        utm_medium: utm.utm_medium ?? metadata.utm_medium ?? null,
        utm_campaign: utm.utm_campaign ?? metadata.utm_campaign ?? null,
        utm_content: utm.utm_content ?? metadata.utm_content ?? null,
        utm_term: utm.utm_term ?? metadata.utm_term ?? null,
        utm_id: utm.utm_id ?? metadata.utm_id ?? null,
        src: utm.src ?? null,
        sck: utm.sck ?? null,
        xcode: null,
        external_product_id: product.id ? String(product.id) : null,
        product_name: product.name ?? null,
        buyer_email_hash,
        buyer_country: user.country ?? null,
      },
    };
  },
};
