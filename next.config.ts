import type { NextConfig } from "next";

const pages = process.env.GITHUB_PAGES === "1";

const nextConfig: NextConfig = {
  ...(pages
    ? {
        output: "export" as const,
        basePath: "/tyaga",
        trailingSlash: true,
      }
    : {}),
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  agentRules: false,
  serverExternalPackages: [
    "@prisma/client",
    "@prisma/adapter-pg",
    "pg",
    "grammy",
    "ioredis",
  ],
  ...(pages
    ? {}
    : {
        async rewrites() {
          return [
            { source: "/v1/:path*", destination: "/api/v1/:path*" },
            {
              source: "/webhooks/telegram",
              destination: "/api/webhooks/telegram",
            },
          ];
        },
        async headers() {
          return [
            {
              source: "/:path*",
              headers: [
                { key: "X-Robots-Tag", value: "noindex, nofollow" },
                { key: "X-Content-Type-Options", value: "nosniff" },
                { key: "Referrer-Policy", value: "no-referrer" },
                {
                  key: "Strict-Transport-Security",
                  value: "max-age=31536000; includeSubDomains",
                },
                {
                  key: "Permissions-Policy",
                  value: "camera=(), microphone=(), geolocation=()",
                },
                {
                  key: "Content-Security-Policy",
                  value: [
                    "default-src 'self'",
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
                    "style-src 'self' 'unsafe-inline'",
                    "img-src 'self' data:",
                    "connect-src 'self' https://*.telegram.org",
                    "frame-ancestors https://web.telegram.org https://*.telegram.org",
                    "base-uri 'self'",
                    "form-action 'self'",
                  ].join("; "),
                },
              ],
            },
          ];
        },
      }),
  cacheComponents: !pages,
  partialPrefetching: !pages,
  reactCompiler: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
