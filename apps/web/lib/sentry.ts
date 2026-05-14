/**
 * Wrapper sobre @sentry/nextjs pra capturas customizadas.
 *
 * Usa em try/catch ou em logs de falhas conhecidas (ex: webhook
 * com signature inválida → não é erro mas vale logar como warning).
 *
 * No-op em dev (NODE_ENV !== production) — economiza quota e ruído.
 */

import * as Sentry from "@sentry/nextjs";

const enabled = process.env.NODE_ENV === "production";

interface CaptureContext {
  /** Categoria curta — webhook | cron | meta-sync | resolver | api */
  area?: string;
  /** ID do user afetado (se houver) */
  userId?: string;
  /** Dados extras pra debug — NUNCA inclui PII (email, nome) */
  extra?: Record<string, any>;
  /** Severidade — fatal | error | warning | info */
  level?: Sentry.SeverityLevel;
  /** Tags pra filtrar no dashboard */
  tags?: Record<string, string>;
}

export function captureError(err: unknown, ctx: CaptureContext = {}) {
  if (!enabled) {
    // Em dev, só loga no console com contexto
    console.error(`[${ctx.area ?? "error"}]`, err, ctx.extra ?? "");
    return;
  }
  Sentry.withScope((scope) => {
    if (ctx.area) scope.setTag("area", ctx.area);
    if (ctx.userId) scope.setUser({ id: ctx.userId });
    if (ctx.tags) {
      for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, v);
    }
    if (ctx.extra) {
      for (const [k, v] of Object.entries(ctx.extra)) scope.setExtra(k, v);
    }
    if (ctx.level) scope.setLevel(ctx.level);
    Sentry.captureException(err);
  });
}

export function captureMessage(message: string, ctx: CaptureContext = {}) {
  if (!enabled) {
    console.log(`[${ctx.area ?? "info"}] ${message}`, ctx.extra ?? "");
    return;
  }
  Sentry.withScope((scope) => {
    if (ctx.area) scope.setTag("area", ctx.area);
    if (ctx.userId) scope.setUser({ id: ctx.userId });
    if (ctx.tags) {
      for (const [k, v] of Object.entries(ctx.tags)) scope.setTag(k, v);
    }
    if (ctx.extra) {
      for (const [k, v] of Object.entries(ctx.extra)) scope.setExtra(k, v);
    }
    Sentry.captureMessage(message, ctx.level ?? "info");
  });
}
