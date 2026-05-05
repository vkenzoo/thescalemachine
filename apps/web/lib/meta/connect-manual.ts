/**
 * Validador de System User Token.
 *
 * Em vez de OAuth, o usuário gera um token vitalício no Business Manager dele
 * e cola no nosso form. Antes de salvar, fazemos:
 *   1. /me — confere que o token é válido e pega o nome
 *   2. /me/permissions — confirma que tem `ads_management`
 *   3. /{bm_id} — confirma que o BM existe e o token tem acesso
 *   4. /{bm_id}/owned_ad_accounts + /client_ad_accounts — lista ad accounts
 *
 * Cada erro vira uma mensagem acionável na UI ("Token sem permissão X — refaça")
 * em vez de um genérico "deu ruim".
 */

import { graphGet, GraphError, isInvalidTokenError } from "./graph-client";

export type ValidationError =
  | "invalid_token"     // token expirado, falso, ou outro problema fatal
  | "wrong_bm"          // token não tem acesso ao BM informado
  | "missing_scope"     // falta ads_management ou business_management
  | "no_accounts"       // BM existe mas nenhuma ad account atribuída ao System User
  | "rate_limited"
  | "network";

export interface ValidatedAdAccount {
  id: string;              // 'act_123456789'
  account_id: string;      // só os dígitos
  name: string;
  currency: string;
  timezone_name: string;
  account_status: number;  // 1 = active, 2 = disabled, etc
  balance: string;         // string em centavos da moeda
  amount_spent: string;
  disable_reason?: number;
}

export interface ValidationResult {
  ok: true;
  fb_user_id: string;
  fb_user_name: string;
  business_manager_id: string;
  business_manager_name: string;
  granted_scopes: string[];
  ad_accounts: ValidatedAdAccount[];
}

export interface ValidationFailure {
  ok: false;
  error: ValidationError;
  detail?: string;
}

/**
 * Roda o checklist completo. Retorna sucesso com tudo que precisa
 * pra persistir, ou falha tipada com mensagem.
 *
 * @param appSecret Opcional — app_secret do cliente (Caminho B). Se omitido,
 *                  usa META_APP_SECRET do env (Caminho A).
 */
export async function validateToken(
  accessToken: string,
  businessManagerId: string,
  appSecret?: string | null
): Promise<ValidationResult | ValidationFailure> {
  // 1. /me — token válido e pega nome
  let me: { id: string; name: string };
  try {
    me = await graphGet<{ id: string; name: string }>(
      accessToken,
      "/me",
      { fields: "id,name" },
      appSecret
    );
  } catch (e) {
    if (isInvalidTokenError(e)) return { ok: false, error: "invalid_token" };
    if (e instanceof GraphError && e.code === "4") return { ok: false, error: "rate_limited" };
    return { ok: false, error: "network", detail: (e as Error).message };
  }

  // 2. /me/permissions — confere ads_management
  try {
    const perms = await graphGet<{ data: { permission: string; status: string }[] }>(
      accessToken,
      "/me/permissions",
      {},
      appSecret
    );
    const granted = perms.data.filter((p) => p.status === "granted").map((p) => p.permission);
    const required = ["ads_management"];
    const missing = required.filter((r) => !granted.includes(r));
    if (missing.length > 0) {
      return { ok: false, error: "missing_scope", detail: missing.join(", ") };
    }

    // 3. /{bm_id} — confirma acesso ao BM
    let bm: { id: string; name: string };
    try {
      bm = await graphGet<{ id: string; name: string }>(
        accessToken,
        `/${businessManagerId}`,
        { fields: "id,name" },
        appSecret
      );
    } catch (e) {
      if (e instanceof GraphError && (e.code === "100" || e.httpStatus === 400 || e.httpStatus === 404)) {
        return { ok: false, error: "wrong_bm" };
      }
      throw e;
    }

    // 4. owned_ad_accounts + client_ad_accounts (alguns BMs só veem por client)
    const fields =
      "id,account_id,name,currency,timezone_name,account_status,balance,amount_spent,disable_reason";
    const [owned, client] = await Promise.all([
      graphGet<{ data: ValidatedAdAccount[] }>(
        accessToken,
        `/${businessManagerId}/owned_ad_accounts`,
        { fields, limit: 200 },
        appSecret
      ).catch(() => ({ data: [] })),
      graphGet<{ data: ValidatedAdAccount[] }>(
        accessToken,
        `/${businessManagerId}/client_ad_accounts`,
        { fields, limit: 200 },
        appSecret
      ).catch(() => ({ data: [] })),
    ]);

    // Merge dedupe por id
    const all = new Map<string, ValidatedAdAccount>();
    for (const acc of [...owned.data, ...client.data]) all.set(acc.id, acc);
    const ad_accounts = Array.from(all.values());

    if (ad_accounts.length === 0) {
      return { ok: false, error: "no_accounts" };
    }

    return {
      ok: true,
      fb_user_id: me.id,
      fb_user_name: me.name,
      business_manager_id: bm.id,
      business_manager_name: bm.name,
      granted_scopes: granted,
      ad_accounts,
    };
  } catch (e) {
    if (isInvalidTokenError(e)) return { ok: false, error: "invalid_token" };
    if (e instanceof GraphError && e.code === "4") return { ok: false, error: "rate_limited" };
    return { ok: false, error: "network", detail: (e as Error).message };
  }
}
