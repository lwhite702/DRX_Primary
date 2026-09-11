#!/usr/bin/env node

/**
 * Production deployment configuration preflight.
 *
 * Validates that all required deployment secrets and configuration are
 * present before invoking any deployment CLI. Exits non-zero with a
 * clear error message if any required value is missing.
 *
 * Usage:
 *   node scripts/release/deploy-preflight.mjs [--environment production|staging]
 *
 * Expected environment variables vary by target:
 *
 * Production:
 *   CONVEX_DEPLOY_KEY, VERCEL_TOKEN, VERCEL_ORG_ID,
 *   VERCEL_PROJECT_ID_PRODUCTION, VERCEL_SCOPE
 *
 * Staging:
 *   CONVEX_DEPLOY_KEY_STAGING, VERCEL_TOKEN_STAGING, VERCEL_ORG_ID_STAGING,
 *   VERCEL_PROJECT_ID_STAGING, VERCEL_SCOPE_STAGING
 *
 * @see .github/workflows/deploy-production.yml
 * @see .github/workflows/deploy-staging.yml
 * @linear WRE-52
 */

const REQUIRED_PRODUCTION = [
  "CONVEX_DEPLOY_KEY",
  "VERCEL_TOKEN",
  "VERCEL_ORG_ID",
  "VERCEL_PROJECT_ID_PRODUCTION",
  "VERCEL_SCOPE",
];

const REQUIRED_STAGING = [
  "CONVEX_DEPLOY_KEY_STAGING",
  "VERCEL_TOKEN_STAGING",
  "VERCEL_ORG_ID_STAGING",
  "VERCEL_PROJECT_ID_STAGING",
  "VERCEL_SCOPE_STAGING",
];

function parseEnvironment() {
  const envFlag = process.argv.indexOf("--environment");
  if (envFlag === -1) return "production";
  const value = process.argv[envFlag + 1];
  if (!value || !["production", "staging"].includes(value)) {
    console.error(
      `[deploy-preflight] Invalid --environment value: ${value ?? "(missing)"}. Expected "production" or "staging".`,
    );
    process.exit(1);
  }
  return value;
}

function validate(environment) {
  const required =
    environment === "staging" ? REQUIRED_STAGING : REQUIRED_PRODUCTION;

  const missing = required.filter((key) => !process.env[key]);

  if (missing.length > 0) {
    console.error(
      `[deploy-preflight] Missing required ${environment} configuration:`,
    );
    for (const key of missing) {
      console.error(`  - ${key}`);
    }
    process.exit(1);
  }

  console.log(
    `[deploy-preflight] All ${required.length} required ${environment} configuration values present`,
  );
}

const environment = parseEnvironment();
validate(environment);
