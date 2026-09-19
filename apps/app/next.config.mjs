import withPWAInit from "@ducanh2912/next-pwa";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: false,
  extendDefaultRuntimeCaching: true,
  workboxOptions: {
    runtimeCaching: [{
      urlPattern: ({ url }) => /^\/(control|admin)(\/|$)/.test(url.pathname) || url.pathname.startsWith("/api/admin/"),
      handler: "NetworkOnly",
    }],
  },
});

const isProd = process.env.NODE_ENV === "production" || process.env.VERCEL_ENV === "production";
const hasBypassConfigured =
  process.env.DANGEROUS_BYPASS_AUTH_FOR_TESTING_ONLY === "true" ||
  process.env.BYPASS_AUTH_FOR_TESTING === "true" ||
  process.env.NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING === "true";

if (isProd && hasBypassConfigured) {
  throw new Error(
    "FATAL CONFIG ERROR: Auth bypass flags (DANGEROUS_BYPASS_AUTH_FOR_TESTING_ONLY or BYPASS_AUTH_FOR_TESTING) must never be enabled in production."
  );
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  async headers() {
    return [
      {
        source: "/control/:path*",
        headers: [
          { key: "Cache-Control", value: "private, no-store" },
          { key: "X-Robots-Tag", value: "noindex, nofollow" },
          { key: "Referrer-Policy", value: "no-referrer" },
        ],
      },
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://clerk.deelrxcrm.app https://*.clerk.accounts.dev https://*.clerk.com https://challenges.cloudflare.com https://snippet.meticulous.ai",
              "style-src 'self' 'unsafe-inline' https://clerk.deelrxcrm.app https://*.clerk.accounts.dev https://*.clerk.com",
              "img-src 'self' data: blob: https://img.clerk.com https://images.clerk.dev https://clerk.deelrxcrm.app https://*.clerk.accounts.dev https://*.clerk.com",
              "font-src 'self' data: https://clerk.deelrxcrm.app https://*.clerk.accounts.dev https://*.clerk.com",
              "connect-src 'self' https://*.convex.cloud wss://*.convex.cloud https://clerk.deelrxcrm.app https://*.clerk.accounts.dev https://*.clerk.com https://*.ingest.sentry.io https://*.posthog.com https://app.posthog.com https://us.i.posthog.com https://snippet.meticulous.ai",
              "frame-src 'self' https://challenges.cloudflare.com https://clerk.deelrxcrm.app https://*.clerk.accounts.dev https://*.clerk.com",
              "frame-ancestors 'none'",
              "object-src 'none'",
              "base-uri 'self'",
            ].join("; "),
          },
        ],
      },
    ];
  },
  output: "standalone",
  transpilePackages: [
    "@deelrx/content",
    "@wrelik/auth",
    "@wrelik/db",
    "@wrelik/storage",
    "@wrelik/analytics",
    "@wrelik/errors",
    "@wrelik/email",
    "@wrelik/jobs",
    "@wrelik/config",
  ],
  typescript: {
    ignoreBuildErrors: false,
  },

  images: {
    unoptimized: true,
  },
  webpack: (config, { isServer, nextRuntime, webpack }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@wrelik/auth$": path.resolve(process.cwd(), "node_modules/@wrelik/auth"),
      "@wrelik/db$": path.resolve(process.cwd(), "node_modules/@wrelik/db"),
      "@wrelik/storage$": path.resolve(process.cwd(), "node_modules/@wrelik/storage"),
      "@wrelik/analytics$": path.resolve(process.cwd(), "node_modules/@wrelik/analytics"),
      "@wrelik/errors$": path.resolve(process.cwd(), "node_modules/@wrelik/errors"),
      "@wrelik/email$": path.resolve(process.cwd(), "node_modules/@wrelik/email"),
      "@wrelik/jobs$": path.resolve(process.cwd(), "node_modules/@wrelik/jobs"),
      "@wrelik/config$": path.resolve(process.cwd(), "node_modules/@wrelik/config"),
    };

    if (!isServer || nextRuntime === "edge") {
      // Strip node: prefix from imports so they can be resolved to fallbacks
      config.plugins.push(
        new webpack.NormalModuleReplacementPlugin(
          /^node:/,
          (resource) => {
            resource.request = resource.request.replace(/^node:/, "");
          }
        )
      );

      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        async_hooks: false,
        inspector: false,
        domain: false,
        os: false,
        dns: false,
        diagnostics_channel: false,
        path: false,
        http: false,
        https: false,
        url: false,
        util: false,
        stream: false,
        crypto: false,
        zlib: false,
        process: false,
        punycode: false,
        querystring: false,
        readline: false,
        repl: false,
        string_decoder: false,
        sys: false,
        timers: false,
        tty: false,
        vm: false,
        worker_threads: false,
        module: false,
        perf_hooks: false,
        v8: false,
        cluster: false,
        dgram: false,
      };
    }
    return config;
  },
  productionBrowserSourceMaps: true,
  // turbopack: {},
};

export default withSentryConfig(withPWA(nextConfig), {
  org: process.env.SENTRY_ORG || "wrelik-0y",
  project: process.env.SENTRY_PROJECT,
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: !process.env.CI,
  widenClientFileUpload: true,
  sourcemaps: {
    disable: !process.env.SENTRY_AUTH_TOKEN,
    deleteSourcemapsAfterUpload: false,
  },
});
// export default nextConfig;
