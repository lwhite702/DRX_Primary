import baseConfig from "../../tooling/eslint/base.mjs";

export default [
  ...baseConfig,
  {
    files: ["lib/wrelik-shims/**", "apps/app/lib/wrelik-shims/**"],
    rules: {
      "no-restricted-imports": "off",
    },
  },
];
