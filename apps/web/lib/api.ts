/**
 * SWR fetcher universal — usado por todos os hooks de dados.
 *
 * Política de cache (compatível com a UX do produto):
 * - dedupingInterval: 5min — múltiplas chamadas pra mesma URL no mesmo tab usam cache
 * - revalidateOnFocus: false — não refaz fetch ao voltar foco (gestor com várias abas
 *   abertas dispararia muitas requests; user usa botão "Atualizar" quando quer fresco)
 * - revalidateOnReconnect: refaz só quando rede volta após desconexão
 * - revalidateIfStale: false — não refaz no mount se já tem cache válido (evita
 *   double-fetch ao trocar de página dentro do TTL)
 * - botão "Atualizar" usa mutate(key) pra forçar bypass
 */

export const SWR_CONFIG = {
  dedupingInterval: 5 * 60 * 1000, // 5min
  revalidateOnFocus: false,
  revalidateOnReconnect: true,
  revalidateIfStale: false,
  errorRetryCount: 2,
};

export const fetcher = async (url: string) => {
  const res = await fetch(url, { credentials: "include" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    let parsed: any = null;
    try { parsed = JSON.parse(text); } catch {}
    const err = new Error(parsed?.error ?? parsed?.message ?? `HTTP ${res.status}`);
    (err as any).status = res.status;
    (err as any).body = parsed;
    throw err;
  }
  return res.json();
};

/**
 * Helper pra POST/PATCH com toast de erro automático.
 */
export async function postJSON<T = any>(url: string, body: unknown): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(data?.error ?? data?.message ?? `HTTP ${res.status}`);
    (err as any).status = res.status;
    (err as any).body = data;
    throw err;
  }
  return data as T;
}
