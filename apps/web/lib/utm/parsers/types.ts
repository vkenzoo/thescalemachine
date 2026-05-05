/**
 * Shape normalizada que TODO parser de gateway deve produzir.
 * Resolver e DB consomem isso, agnóstico do gateway.
 */
export interface NormalizedSale {
  event_type: string;
  external_transaction_id: string;
  external_event_id: string;
  occurred_at: string;            // ISO-8601 UTC
  status: string;                 // approved | refunded | chargedback | ...

  gross_value_cents: number | null;
  net_value_cents: number | null;
  fee_cents: number | null;
  currency: string | null;

  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  utm_id: string | null;
  src: string | null;
  sck: string | null;
  xcode: string | null;

  external_product_id: string | null;
  product_name: string | null;

  buyer_email_hash: string | null;
  buyer_country: string | null;
}

export type ParserOutput =
  | { ok: true; sale: NormalizedSale }
  | { ok: false; error: string; detail?: string };

export interface GatewayParser {
  verifySignature(opts: {
    rawBody: string;
    headers: Record<string, string>;
    signingSecret: string | null;
  }): boolean;
  parse(payload: any): ParserOutput;
}
