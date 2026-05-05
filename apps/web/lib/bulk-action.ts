/**
 * Helper pra aplicar ações em lote sobre múltiplos IDs (campanhas, conjuntos, anúncios).
 * Roda em chunks de 5 pra não estourar rate limits da Graph API.
 *
 * Suporta:
 *  - status (pause/activate/delete)
 *  - update arbitrary (daily_budget, name, etc) via opções `update`
 *  - duplicate via opções `duplicate`
 */

export type EntityKind = "campaign" | "adset" | "ad";
export type BulkActionKind = "pause" | "activate" | "delete" | "update" | "duplicate";

interface BulkResult {
  success: number;
  failed: number;
  errors: { id: string; message: string }[];
}

interface BulkOptions {
  kind: EntityKind;
  ids: string[];
  action: BulkActionKind;
  /** Pra action="update": payload aplicado a cada item (ex: { daily_budget: 100 }, { name: "novo" }) */
  payload?: Record<string, unknown>;
  /** Pra action="update" com nome: se fornecido, faz find/replace em vez de set absoluto.
   *  Recebe o nome atual (vem em `currentNames` map) e retorna o novo. */
  computeName?: (id: string, currentName: string) => string;
  currentNames?: Map<string, string>;
  /** Concorrência (default 5) */
  chunkSize?: number;
  onProgress?: (done: number, total: number, currentId: string, success: boolean) => void;
}

const ENDPOINT_PATH: Record<EntityKind, string> = {
  campaign: "/api/meta/campaigns",
  adset: "/api/meta/adsets",
  ad: "/api/meta/ads",
};

const STATUS_BY_ACTION: Partial<Record<BulkActionKind, "PAUSED" | "ACTIVE">> = {
  pause: "PAUSED",
  activate: "ACTIVE",
};

export async function bulkAction(opts: BulkOptions): Promise<BulkResult> {
  const { kind, ids, action, payload, computeName, currentNames, chunkSize = 5, onProgress } = opts;
  const path = ENDPOINT_PATH[kind];

  let success = 0;
  let failed = 0;
  let done = 0;
  const errors: { id: string; message: string }[] = [];

  for (let i = 0; i < ids.length; i += chunkSize) {
    const chunk = ids.slice(i, i + chunkSize);
    const results = await Promise.allSettled(
      chunk.map(async (id) => {
        try {
          let res: Response;
          if (action === "delete") {
            res = await fetch(`${path}/${id}`, {
              method: "DELETE",
              credentials: "include",
            });
          } else if (action === "duplicate") {
            res = await fetch(`${path}/${id}/duplicate`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify({}),
            });
          } else {
            // pause/activate/update — todos vão pelo mesmo endpoint POST com payload
            const body: Record<string, unknown> = {};
            const status = STATUS_BY_ACTION[action];
            if (status) body.status = status;
            if (action === "update" && payload) Object.assign(body, payload);
            if (action === "update" && computeName && currentNames) {
              const cur = currentNames.get(id);
              if (cur) body.name = computeName(id, cur);
            }
            res = await fetch(`${path}/${id}`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              credentials: "include",
              body: JSON.stringify(body),
            });
          }
          if (!res.ok) {
            const data = await res.json().catch(() => ({}));
            throw new Error(data?.message ?? data?.error ?? `HTTP ${res.status}`);
          }
          return { id, ok: true as const };
        } catch (err) {
          return { id, ok: false as const, message: (err as Error).message };
        }
      })
    );

    for (const r of results) {
      done++;
      if (r.status === "fulfilled" && r.value.ok) {
        success++;
        onProgress?.(done, ids.length, r.value.id, true);
      } else if (r.status === "fulfilled") {
        failed++;
        errors.push({ id: r.value.id, message: r.value.message });
        onProgress?.(done, ids.length, r.value.id, false);
      } else {
        failed++;
        errors.push({ id: "unknown", message: r.reason?.message ?? "erro" });
        onProgress?.(done, ids.length, "unknown", false);
      }
    }
  }

  return { success, failed, errors };
}
