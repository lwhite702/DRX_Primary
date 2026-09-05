import withPWAInit from "@ducanh2912/next-pwa";
import path from "path";
import { withSentryConfig } from "@sentry/nextjs";

const withPWA = withPWAInit({
  dest: "public",
  disable: process.env.NODE_ENV === "development",
  register: true,
  skipWaiting: false,
});

/** @type {import('next').NextConfig} */
const nextConfig = {
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
  },
});
// export default nextConfig;
