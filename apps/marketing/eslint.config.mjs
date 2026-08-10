import baseConfig from "../../tooling/eslint/base.mjs";

const marketingRestrictions = {
  patterns: [
    "apps/app/**",
    "../app/**",
    "../../app/**",
    "../../../app/**",
    "@wrelik/**",
    "@clerk/**",
    "@supabase/**",
    "@aws-sdk/**",
    "prisma",
    "pg",
    "jsonwebtoken",
    "server-only",
  ],
  paths: [
    { name: "fs", message: "Marketing must stay client-only." },
    { name: "net", message: "Marketing must stay client-only." },
    { name: "tls", message: "Marketing must stay client-only." },
    {
      name: "apps/app",
      message: "Do not import from the app runtime in marketing.",
    },
  ],
};

const enhancedConfig = baseConfig.map((config) => {
  if (!config.rules || !config.rules["no-restricted-imports"]) {
    return config;
  }

  const restriction = config.rules["no-restricted-imports"];
  const [level, options] = Array.isArray(restriction)
    ? restriction
    : [restriction, undefined];
  const existingPatterns = options?.patterns ?? [];
  const existingPaths = options?.paths ?? [];

  return {
    ...config,
    rules: {
      ...config.rules,
      "no-restricted-imports": [
        level,
        {
          ...options,
          patterns: [...existingPatterns, ...marketingRestrictions.patterns],
          paths: [...existingPaths, ...marketingRestrictions.paths],
        },
      ],
    },
  };
});

export default enhancedConfig;
