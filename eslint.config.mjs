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
          paths: [
            {
              name: "posthog-js",
              message: "Please use @wrelik/analytics instead.",
            },
            {
              name: "resend",
              message: "Please use @wrelik/email instead.",
            },
            {
              name: "inngest",
              message: "Please use @wrelik/jobs instead.",
            },
          ],
          patterns: [
            {
              group: ["@clerk/*"],
              message: "Please use @wrelik/auth instead.",
            },
            {
              group: ["@sentry/*"],
              message: "Please use @wrelik/errors instead.",
            },
            {
              group: ["@aws-sdk/*"],
              message: "Please use @wrelik/storage or other adapters instead.",
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
