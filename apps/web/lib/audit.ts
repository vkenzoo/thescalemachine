/**
 * Audit log próprio — substitui Sentry.
 *
 * Grava eventos em `audit_events` no Supabase (admin client). Visualizado em /admin.
 *
 * Uso típico:
 *   import { logEvent } from "@/lib/audit";
 *   try { ... } catch (e) {
 *     logEvent("error", { area: "webhook", message: e.message, userId, extra: {...} });
 *   }
 *
 * Fire-and-forget — não throws, não bloqueia request.
 */

import { createAdminClient } from "@/lib/supabase/admin";

export type Severity = "info" | "warning" | "error";

interface LogContext {
  area: string;                    // 'webhook' | 'cron-rules' | 'cron-alerts' | 'meta-sync' | 'resolver' | 'api'
  message: string;
  userId?: string | null;
  /** Tags pra filtragem rápida no /admin (gateway, account_id, etc.) */
  tags?: Record<string, string>;
  /** Dados extras pra debug — JSON livre, sem PII */
  extra?: Record<string, any>;
  /** Se erro, stack trace */
  stack?: string;
}

let supabase: ReturnType<typeof createAdminClient> | null = null;
function getClient() {
  if (!supabase) supabase = createAdminClient();
  return supabase;
}

export function logEvent(severity: Severity, ctx: LogContext): void {
  // Fire-and-forget — nunca bloqueia o caller
  void getClient()
    .from("audit_events")
    .insert({
      severity,
      area: ctx.area,
      message: ctx.message.slice(0, 1000),
      user_id: ctx.userId ?? null,
      tags: ctx.tags ?? {},
      extra: ctx.extra ?? {},
      stack: ctx.stack ?? null,
    })
    .then(({ error }) => {
      if (error) console.error("[audit] failed to log:", error.message, ctx);
    });
}

/** Helper pra try/catch — extrai message + stack + envia */
export function logError(err: unknown, ctx: Omit<LogContext, "message" | "stack"> & { message?: string }) {
  const e = err as any;
  logEvent("error", {
    ...ctx,
    message: ctx.message ?? e?.message ?? String(err),
    stack: e?.stack,
  });
}
