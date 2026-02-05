import js from "@eslint/js";
import tseslint from "typescript-eslint";
import react from "eslint-plugin-react";
import reactHooks from "eslint-plugin-react-hooks";
import jsxA11y from "eslint-plugin-jsx-a11y";

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
        {
          patterns: [
            "@supabase/*",
            "@sentry/*",
            "posthog-js",
            "@aws-sdk/*",
            "resend",
            "inngest",
          ],
          paths: [
            {
              name: "@supabase/supabase-js",
              message: "Use @wrelik/db instead of direct Supabase SDK",
            },
            {
              name: "@supabase/ssr",
              message: "Use @wrelik/db instead of direct Supabase SDK",
            },
            {
              name: "@sentry/nextjs",
              message: "Use @wrelik/errors instead of direct Sentry SDK",
            },
            {
              name: "posthog-js",
              message: "Use @wrelik/analytics instead of direct PostHog SDK",
            },
          ],
        },
      ],
    },
  },
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "out/**",
      "dist/**",
      "build/**",
      "*.config.js",
      "*.config.mjs",
    ],
  },
];
