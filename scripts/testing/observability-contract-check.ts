import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const checks: Array<{ file: string; tokens: string[] }> = [
  {
    file: "apps/app/components/providers/posthog-provider.tsx",
    tokens: ["initAnalytics", "capturePageView", "NEXT_PUBLIC_POSTHOG_KEY"],
  },
  {
    file: "apps/app/instrumentation.ts",
    tokens: ["sentry.server.config", "sentry.edge.config"],
  },
  {
    file: "apps/app/instrumentation-client.ts",
    tokens: ["Sentry.init", "NEXT_PUBLIC_SENTRY_DSN", "sendDefaultPii: false"],
  },
  {
    file: "apps/app/sentry.server.config.ts",
    tokens: ["Sentry.init", "SENTRY_DSN", "sendDefaultPii: false"],
  },
  {
    file: "apps/app/sentry.edge.config.ts",
    tokens: ["Sentry.init", "SENTRY_DSN", "sendDefaultPii: false"],
  },
];

const requiredEnvKeys = [
  "NEXT_PUBLIC_POSTHOG_KEY",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "NEXT_PUBLIC_SENTRY_DSN",
  "NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY",
  "CLERK_SECRET_KEY",
];

function fail(msg: string): never {
  console.error(`Observability contract check failed: ${msg}`);
  process.exit(1);
}

function assertFileTokens(file: string, tokens: string[]) {
  const abs = path.join(root, file);
  if (!fs.existsSync(abs)) fail(`Missing file: ${file}`);
  const text = fs.readFileSync(abs, "utf8");
  for (const token of tokens) {
    if (!text.includes(token)) {
      fail(`Missing token '${token}' in ${file}`);
    }
  }
}

function assertEnvExample() {
  const envPath = path.join(root, "apps/app/.env.example");
  if (!fs.existsSync(envPath)) fail("Missing apps/app/.env.example");
  const envText = fs.readFileSync(envPath, "utf8");
  for (const key of requiredEnvKeys) {
    if (!envText.includes(`${key}=`)) {
      fail(`Missing ${key} in apps/app/.env.example`);
    }
  }
}

function assertDeps() {
  const pkgPath = path.join(root, "apps/app/package.json");
  const pkg = JSON.parse(fs.readFileSync(pkgPath, "utf8")) as {
    dependencies?: Record<string, string>;
  };

  const deps = pkg.dependencies || {};
  if (!deps["posthog-js"]) fail("posthog-js is not installed in apps/app/package.json");
  if (!deps["@sentry/nextjs"]) fail("@sentry/nextjs is not installed in apps/app/package.json");
}

function main() {
  for (const check of checks) {
    assertFileTokens(check.file, check.tokens);
  }
  assertEnvExample();
  assertDeps();
  console.log("Observability contract check passed.");
}

main();
