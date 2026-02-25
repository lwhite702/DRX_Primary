import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

const restrictedImportOptions = {
  patterns: [
    "@clerk/*",
    "@supabase/*",
    "@sentry/*",
    "@upstash/*",
    "posthog-js",
    "posthog-node",
    "posthog-react-native",
    "resend",
    "inngest",
    "@aws-sdk/*",
  ],
  paths: [
    {
      name: "@clerk/nextjs",
      message: "Use the app auth adapter (`@/lib/adapters/auth/ui`) instead of importing Clerk directly.",
    },
    {
      name: "@clerk/nextjs/server",
      message:
        "Use the app auth adapter (`@/lib/adapters/auth/server`) instead of importing Clerk directly.",
    },
    {
      name: "@supabase/supabase-js",
      message: "Use `@/lib/supabase/*` bridge or `@wrelik/db` instead of direct Supabase SDK imports.",
    },
    {
      name: "@supabase/ssr",
      message: "Use `@/lib/supabase/*` bridge or `@wrelik/db` instead of direct Supabase SDK imports.",
    },
    {
      name: "@sentry/nextjs",
      message: "Use `@/lib/adapters/errors` or `@wrelik/errors` instead of direct Sentry SDK imports.",
    },
    {
      name: "posthog-js",
      message: "Use `@/lib/adapters/analytics` or `@wrelik/analytics` instead of direct PostHog SDK imports.",
    },
    {
      name: "@aws-sdk/client-s3",
      message: "Use `@/lib/adapters/storage` or `@wrelik/storage` instead of direct S3 clients.",
    },
    {
      name: "@aws-sdk/lib-storage",
      message: "Use `@/lib/adapters/storage` or `@wrelik/storage` instead of direct S3 clients.",
    },
    {
      name: "resend",
      message: "Use `@/lib/adapters/email` or `@wrelik/email` instead of direct Resend SDK imports.",
    },
    {
      name: "inngest",
      message: "Use `@/lib/adapters/jobs` or `@wrelik/jobs` instead of direct Inngest imports.",
    },
    {
      name: "@upstash/redis",
      message: "Use a Wrelik adapter boundary (temporary exception only in the dedicated Redis bridge file).",
    },
    {
      name: "@upstash/ratelimit",
      message: "Use a Wrelik adapter boundary (temporary exception only in the dedicated rate-limit bridge file).",
    },
    {
      name: "@wrelik/auth",
      message: "Use explicit runtime subpaths: @wrelik/auth/server, /client, or /shared.",
    },
    {
      name: "@wrelik/db",
      message: "Use explicit runtime subpaths: @wrelik/db/server, /client, or /shared.",
    },
    {
      name: "@wrelik/config",
      message: "Use explicit runtime subpaths: @wrelik/config/server, /client, or /shared.",
    },
    {
      name: "@wrelik/errors",
      message: "Use explicit runtime subpaths: @wrelik/errors/server, /client, or /shared.",
    },
    {
      name: "@wrelik/storage",
      message: "Use explicit runtime subpaths: @wrelik/storage/server, /client, or /shared.",
    },
    {
      name: "@wrelik/analytics",
      message: "Use explicit runtime subpaths: @wrelik/analytics/server, /client, or /shared.",
    },
    {
      name: "@wrelik/email",
      message: "Use explicit runtime subpaths: @wrelik/email/server, /client, or /shared.",
    },
    {
      name: "@wrelik/jobs",
      message: "Use explicit runtime subpaths: @wrelik/jobs/server, /client, or /shared.",
    },
  ],
};

export default [
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{js,mjs,cjs,ts,jsx,tsx}"],
    plugins: {
      react,
      "react-hooks": reactHooks,
      "jsx-a11y": jsxA11y,
    },
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
      globals: {
        React: "readonly",
        JSX: "readonly",
      },
    },
    rules: {
      "react/react-in-jsx-scope": "off",
      "react/prop-types": "off",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        { argsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "warn",

      "no-restricted-imports": [
        "error",
        restrictedImportOptions,
      ],
    },
  },
  {
    files: [
      "lib/adapters/**",
      "lib/supabase/**",
      "src/adapters/**",
      "apps/app/lib/adapters/**",
      "apps/app/lib/supabase/**",
      "apps/mobile/src/adapters/**",
      "apps/**/tests/**",
      "**/*.test.{js,jsx,ts,tsx}",
      "**/*.spec.{js,jsx,ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": "off",
    },
  },
  {
    files: [
      "lib/adapters/**",
      "src/adapters/**",
      "apps/app/lib/adapters/**",
      "apps/mobile/src/adapters/**",
    ],
    rules: {
      // Keep transitional vendor imports unblocked in adapter layers for now,
      // but enforce runtime subpaths for all @wrelik package imports.
      "no-restricted-imports": [
        "error",
        {
          paths: restrictedImportOptions.paths.filter((entry) =>
            entry.name.startsWith("@wrelik/")
          ),
        },
      ],
    },
  },
  {
    files: [
      "apps/app/lib/redis.ts",
      "apps/app/lib/credit/aiEngine/limitEngine.ts",
    ],
    rules: {
      // Temporary bridge exceptions until @wrelik Upstash adapters exist.
      "no-restricted-imports": "off",
    },
  },
  {
    ignores: [
      ".next/**",
      ".prisma/**",
      "**/.prisma/**",
      "node_modules/**",
      "out/**",
      "dist/**",
      "build/**",
      "packages/wrelik-*/**",
      "*.config.js",
      "*.config.mjs",
    ],
  },
];
