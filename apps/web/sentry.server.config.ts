/**
 * Sentry — Server (Node runtime) config.
 * Capturado apenas se SENTRY_DSN configurado no env.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.SENTRY_DSN || process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    // Em dev (localhost) não envia pra Sentry — vira ruído
    enabled: process.env.NODE_ENV === "production",
  });
}
