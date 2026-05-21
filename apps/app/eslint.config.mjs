import baseConfig from "../../tooling/eslint/base.mjs";

export default [
  ...baseConfig,
  {
    ignores: ["public/sw.js", "public/workbox-*.js"],
  },
  {
    files: ["scripts/**/*.mjs"],
    languageOptions: {
      globals: {
        console: "readonly",
        process: "readonly",
      },
    },
  },
  {
    files: ["lib/data/client/supabase-client.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: [
      "components/providers/posthog-provider.tsx",
      "lib/credit/aiEngine/limitEngine.ts",
      "lib/redis.ts",
      "sentry.client.config.ts",
      "sentry.edge.config.ts",
      "sentry.server.config.ts",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];
