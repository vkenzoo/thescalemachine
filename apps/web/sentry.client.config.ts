/**
 * Sentry — Client (browser) config.
 * Capturado apenas se NEXT_PUBLIC_SENTRY_DSN configurado no env.
 */
import * as Sentry from "@sentry/nextjs";

const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;

if (dsn) {
  Sentry.init({
    dsn,
    environment: process.env.NODE_ENV,
    // Sample rate baixo em prod pra evitar quota burn
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,
    replaysSessionSampleRate: 0,        // sem session replay (privacidade)
    replaysOnErrorSampleRate: 0.5,      // só grava replay em erros
    // Filtra erros conhecidos / não-acionáveis
    ignoreErrors: [
      "ResizeObserver loop limit exceeded",
      "Network request failed",
      "Non-Error promise rejection captured",
      // Ad blockers, extensões
      "TypeError: Failed to fetch",
      "ChunkLoadError",
    ],
  });
}
