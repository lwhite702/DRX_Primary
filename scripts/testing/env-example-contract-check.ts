import fs from "fs";
import path from "path";

const root = process.cwd();
const rootEnvExamplePath = path.join(root, ".env.example");
const appEnvExamplePath = path.join(root, "apps/app/.env.example");

const runtimeRoots = [
  "apps/app/app",
  "apps/app/components",
  "apps/app/lib",
  "apps/app/edge",
  "apps/app/supabase/functions",
];

const runtimeFiles = [
  "apps/app/middleware.ts",
  "apps/app/instrumentation.ts",
  "apps/app/instrumentation-client.ts",
  "apps/app/sentry.client.config.ts",
  "apps/app/sentry.server.config.ts",
  "apps/app/sentry.edge.config.ts",
  "apps/app/playwright.config.ts",
  "apps/app/vitest.config.ts",
];

const codeExts = new Set([".ts", ".tsx", ".js", ".mjs"]);
const ignoredRuntimeKeys = new Set([
  "CI",
  "NEXT_RUNTIME",
  "NODE_ENV",
  "PLAYWRIGHT_APP_PORT",
  "PW_NEXT_WEBPACK",
  "PW_REUSE_EXISTING_SERVER",
  "PW_SKIP_GLOBAL_SETUP",
  "VITEST",
]);

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

function readText(filePath: string): string {
  if (!fs.existsSync(filePath)) {
    fail(`Missing file: ${path.relative(root, filePath)}`);
  }

  return fs.readFileSync(filePath, "utf8");
}

function collectCodeFiles(entryPath: string, files: string[]) {
  const stats = fs.statSync(entryPath);
  if (stats.isFile()) {
    if (codeExts.has(path.extname(entryPath))) {
      files.push(entryPath);
    }
    return;
  }

  const dirEntries = fs.readdirSync(entryPath, { withFileTypes: true });
  for (const dirEntry of dirEntries) {
    if (dirEntry.name === "node_modules" || dirEntry.name === ".next") continue;
    if (dirEntry.name === "tests" || dirEntry.name === "scripts") continue;
    collectCodeFiles(path.join(entryPath, dirEntry.name), files);
  }
}

function extractRuntimeEnvKeys(files: string[]): Set<string> {
  const keys = new Set<string>();

  for (const filePath of files) {
    const text = readText(filePath);
    for (const match of text.matchAll(/process\.env\.([A-Z0-9_]+)/g)) {
      keys.add(match[1]);
    }
    for (const match of text.matchAll(/Deno\.env\.get\(\s*["'`]([A-Z0-9_]+)["'`]\s*\)/g)) {
      keys.add(match[1]);
    }
  }

  for (const ignoredKey of ignoredRuntimeKeys) {
    keys.delete(ignoredKey);
  }

  return keys;
}

function extractEnvExampleKeys(filePath: string): Set<string> {
  const text = readText(filePath);
  const keys = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    const match = line.match(/^([A-Z0-9_]+)=/);
    if (match) keys.add(match[1]);
  }
  return keys;
}

function sorted(values: Iterable<string>): string[] {
  return [...values].sort((a, b) => a.localeCompare(b));
}

const scannedFiles: string[] = [];
for (const runtimeRoot of runtimeRoots) {
  const runtimeRootPath = path.join(root, runtimeRoot);
  if (fs.existsSync(runtimeRootPath)) {
    collectCodeFiles(runtimeRootPath, scannedFiles);
  }
}
for (const runtimeFile of runtimeFiles) {
  const runtimeFilePath = path.join(root, runtimeFile);
  if (fs.existsSync(runtimeFilePath)) {
    scannedFiles.push(runtimeFilePath);
  }
}

const runtimeEnvKeys = extractRuntimeEnvKeys(scannedFiles);
const rootEnvKeys = extractEnvExampleKeys(rootEnvExamplePath);
const appEnvKeys = extractEnvExampleKeys(appEnvExamplePath);

const missingFromRoot = sorted(
  [...runtimeEnvKeys].filter((key) => !rootEnvKeys.has(key)),
);
const missingFromApp = sorted(
  [...runtimeEnvKeys].filter((key) => !appEnvKeys.has(key)),
);
const missingFromAppMirror = sorted(
  [...rootEnvKeys].filter((key) => !appEnvKeys.has(key)),
);
const missingFromRootMirror = sorted(
  [...appEnvKeys].filter((key) => !rootEnvKeys.has(key)),
);

if (
  missingFromRoot.length > 0 ||
  missingFromApp.length > 0 ||
  missingFromAppMirror.length > 0 ||
  missingFromRootMirror.length > 0
) {
  if (missingFromRoot.length > 0) {
    console.error(
      `Missing keys in .env.example: ${missingFromRoot.join(", ")}`,
    );
  }
  if (missingFromApp.length > 0) {
    console.error(
      `Missing keys in apps/app/.env.example: ${missingFromApp.join(", ")}`,
    );
  }
  if (missingFromAppMirror.length > 0) {
    console.error(
      `Keys present in .env.example but missing in apps/app/.env.example: ${missingFromAppMirror.join(", ")}`,
    );
  }
  if (missingFromRootMirror.length > 0) {
    console.error(
      `Keys present in apps/app/.env.example but missing in .env.example: ${missingFromRootMirror.join(", ")}`,
    );
  }
  process.exit(1);
}

console.log(
  `Env example contract check passed. Runtime keys verified: ${runtimeEnvKeys.size}`,
);

