import baseConfig from "../../tooling/eslint/base.mjs";

export default [
  ...baseConfig,
  {
    files: ["lib/data/client/supabase-client.ts"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];
