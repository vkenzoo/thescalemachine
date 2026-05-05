/**
 * Meta Graph API client.
 *
 * Princípios:
 * - SEMPRE inclui `appsecret_proof` (HMAC-SHA256 do token com app_secret).
 *   Isso garante que mesmo se o token vazar, atacante não consegue chamar a API
 *   sem o app_secret.
 * - Suporta Caminho B (cada cliente tem o próprio app): aceita `appSecret`
 *   por chamada. Quando não passado, faz fallback ao META_APP_SECRET do env
 *   (Caminho A — nosso app único, mantido por backward compat).
 * - Retry com backoff exponencial em rate limit
 * - Erros tipados pra UI tratar especificamente
 */

import { createHmac } from "node:crypto";

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || "v23.0";
const BASE_URL = `https://graph.facebook.com/${GRAPH_VERSION}`;

export class GraphError extends Error {
  constructor(
    message: string,
    public code: string,
    public httpStatus: number,
    public raw: any
  ) {
    super(message);
    this.name = "GraphError";
  }
}

/**
 * Resolve o app_secret a usar:
 * 1. Se `provided` foi passado, usa ele (Caminho B — cliente trouxe o próprio)
 * 2. Senão, usa META_APP_SECRET do env (Caminho A — fallback)
 */
function resolveAppSecret(provided?: string | null): string {
  if (provided && provided.length > 0) return provided;
  const envSecret = process.env.META_APP_SECRET;
  if (!envSecret) {
    throw new Error("Nenhum app_secret disponível (nem fornecido pela conexão, nem via env META_APP_SECRET).");
  }
  return envSecret;
}

/**
 * Calcula appsecret_proof = HMAC-SHA256(access_token, app_secret), em hex.
 */
export function appsecretProof(accessToken: string, appSecret?: string | null): string {
  const secret = resolveAppSecret(appSecret);
  return createHmac("sha256", secret).update(accessToken).digest("hex");
}

interface GraphParams {
  [key: string]: string | number | boolean | undefined;
}

/**
 * GET genérico.
 * @param accessToken Token de acesso (System User ou User Token)
 * @param path Caminho relativo na Graph (ex: "/me", "/{ad_account_id}/campaigns")
 * @param params Query params (sem access_token nem appsecret_proof — adicionados automaticamente)
 * @param appSecret Opcional — app_secret específico do cliente. Se omitido, usa env.
 */
export async function graphGet<T = any>(
  accessToken: string,
  path: string,
  params: GraphParams = {},
  appSecret?: string | null,
  attempt = 0
): Promise<T> {
  const url = new URL(`${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`);

  url.searchParams.set("access_token", accessToken);
  url.searchParams.set("appsecret_proof", appsecretProof(accessToken, appSecret));
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
  }

  const res = await fetch(url, { method: "GET", cache: "no-store" });
  const json = await res.json();

  if (!res.ok) {
    const error = json.error ?? {};
    const code = error.code?.toString() ?? String(res.status);
    const message = error.message ?? "Erro desconhecido na Graph API";

    const isRateLimit = code === "4" || code === "17" || code === "32" || res.status === 429;
    if (isRateLimit && attempt < 2) {
      const wait = Math.pow(2, attempt) * 1000 + Math.random() * 500;
      await new Promise((r) => setTimeout(r, wait));
      return graphGet(accessToken, path, params, appSecret, attempt + 1);
    }

    throw new GraphError(message, code, res.status, error);
  }

  return json as T;
}

/**
 * POST genérico (form-urlencoded — padrão da Graph API pra updates).
 */
export async function graphPost<T = any>(
  accessToken: string,
  path: string,
  body: GraphParams = {},
  appSecret?: string | null
): Promise<T> {
  const url = `${BASE_URL}${path.startsWith("/") ? path : `/${path}`}`;
  const form = new URLSearchParams();
  form.set("access_token", accessToken);
  form.set("appsecret_proof", appsecretProof(accessToken, appSecret));
  for (const [k, v] of Object.entries(body)) {
    if (v !== undefined && v !== null) form.set(k, String(v));
  }

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: form,
  });
  const json = await res.json();

  if (!res.ok) {
    const error = json.error ?? {};
    throw new GraphError(
      error.message ?? "Erro desconhecido na Graph API",
      error.code?.toString() ?? String(res.status),
      res.status,
      error
    );
  }
  return json as T;
}

/**
 * Detecta token inválido/revogado pra marcar a conexão como `invalid`.
 */
export function isInvalidTokenError(err: unknown): boolean {
  if (!(err instanceof GraphError)) return false;
  return err.code === "190" || err.code === "102" || err.httpStatus === 401;
}
