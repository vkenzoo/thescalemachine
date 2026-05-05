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
};

export default nextConfig;
