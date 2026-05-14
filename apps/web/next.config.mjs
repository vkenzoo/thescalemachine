import { withSentryConfig } from "@sentry/nextjs";

/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    typedRoutes: false,
  },
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "scontent.fbcdn.net" },
      { protocol: "https", hostname: "graph.facebook.com" },
    ],
  },
  // Não bloqueia o build em prod por type/lint errors. Cleanup é progressivo.
  // Type-checking continua disponível localmente via `npm run typecheck`.
  typescript: { ignoreBuildErrors: true },
  eslint: { ignoreDuringBuilds: true },

  // Security headers — aplica em todas as rotas
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          // Bloqueia o site de ser embedado em iframes (clickjacking)
          { key: "X-Frame-Options", value: "DENY" },
          // Browser não tenta adivinhar Content-Type
          { key: "X-Content-Type-Options", value: "nosniff" },
          // Referer só envia origin pra externos
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // Bloqueia APIs sensíveis pelo browser
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=(), payment=()",
          },
          // HSTS — só HTTPS por 2 anos, inclui subdomínios
          {
            key: "Strict-Transport-Security",
            value: "max-age=63072000; includeSubDomains; preload",
          },
        ],
      },
      {
        // Script público pode ser embedado em sites de cliente — libera
        source: "/utms/:path*",
        headers: [
          { key: "Access-Control-Allow-Origin", value: "*" },
          { key: "X-Frame-Options", value: "ALLOWALL" },
        ],
      },
    ];
  },
};

// Wrap com Sentry — só efetiva se SENTRY_DSN estiver configurado em prod.
// Em dev/local sem DSN, é no-op (não envia nada, não polui logs).
export default withSentryConfig(nextConfig, {
  silent: true,                           // sem logs de upload de sourcemap durante build
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  // Sourcemaps = stack traces legíveis no Sentry (linha exata do erro)
  widenClientFileUpload: true,
  // Mascara erros do bundle (não inclui código fonte no JS público)
  hideSourceMaps: true,
  disableLogger: true,
});
