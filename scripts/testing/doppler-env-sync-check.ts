import { spawnSync } from "node:child_process";

const root = process.cwd();
const defaultProject = "drx";
const defaultConfigs = ["prd"];

// Doppler owns deploy-time secrets and stable runtime configuration. Vercel
// metadata, test-only switches, and optional integrations remain documented in
// .env.example but are intentionally outside this production sync contract.
const requiredDopplerKeys = [
  "CLERK_SECRET_KEY",
  "DATABASE_URL",
  "DRX_PII_HASH_KEY_B64",
  "DRX_PII_KEY_CURRENT_B64",
  "DRX_PRIVACY_CLEANUP_SECRET",
  "INNGEST_EVENT_KEY",
  "INNGEST_SIGNING_KEY",
  "KV_REST_API_TOKEN",
  "KV_REST_API_URL",
  "NEXT_PUBLIC_APP_URL",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "NEXT_PUBLIC_MARKETING_URL",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_SENTRY_DSN",
  "R2_ACCESS_KEY_ID",
  "R2_ACCOUNT_ID",
  "R2_BUCKET_NAME",
  "R2_SECRET_ACCESS_KEY",
  "RESEND_API_KEY",
  "SENTRY_AUTH_TOKEN",
  "SENTRY_DSN",
  "SENTRY_ORG",
  "SENTRY_PROJECT",
] as const;

function fail(message: string): never {
  console.error(`Doppler sync check failed: ${message}`);
  process.exit(1);
}

function parseConfigs(raw: string | undefined): string[] {
  const configs = (raw ?? "")
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);

  return configs.length > 0 ? configs : defaultConfigs;
}

function ensureDopplerAvailable() {
  const check = spawnSync("doppler", ["--version"], {
    cwd: root,
    encoding: "utf8",
  });

  if (check.status !== 0) {
    fail("Doppler CLI is not available in PATH.");
  }
}

function fetchSecretNames(config: string, project: string): Set<string> {
  const args = [
    "secrets",
    "--only-names",
    "--json",
    "--config",
    config,
    "--project",
    project,
  ];

  const proc = spawnSync("doppler", args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });

  if (proc.status !== 0) {
    const details = (proc.stderr || proc.stdout || "unknown error").trim();
    fail(`Unable to fetch Doppler secrets for config '${config}'. ${details}`);
  }

  try {
    const parsed = JSON.parse(proc.stdout || "{}") as Record<string, unknown>;
    return new Set(Object.keys(parsed));
  } catch (error) {
    fail(`Invalid secret-name JSON returned by Doppler for config '${config}'. ${(error as Error).message}`);
  }
}

function checkConfig(config: string, project: string) {
  const secretNames = fetchSecretNames(config, project);
  const missing = requiredDopplerKeys.filter((key) => !secretNames.has(key));

  if (missing.length > 0) {
    fail(
      `Config '${config}' is missing ${missing.length} key(s): ${missing.join(", ")}`,
    );
  }

  console.log(
    `Doppler project '${project}' config '${config}' includes all ${requiredDopplerKeys.length} required key(s).`,
  );
}

function main() {
  ensureDopplerAvailable();

  const project = process.env.DOPPLER_PROJECT?.trim() || defaultProject;
  const configs = parseConfigs(process.env.DOPPLER_CONFIGS);

  for (const config of configs) {
    checkConfig(config, project);
  }

  console.log("Doppler env sync check passed.");
}

main();
