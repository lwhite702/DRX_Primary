import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { config as loadEnv } from "dotenv";

const root = process.cwd();
const envExamplePath = path.join(root, "apps/app/.env.example");
const envLocalPath = path.join(root, "apps/app/.env.local");

function fail(message: string): never {
  console.error(`Doppler sync failed: ${message}`);
  process.exit(1);
}

function getRequiredEntries(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    fail(`Missing env template: ${path.relative(root, filePath)}`);
  }

  const text = fs.readFileSync(filePath, "utf8");
  const entries: Record<string, string> = {};
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const match = line.match(/^([A-Z0-9_]+)\s*=\s*(.*)$/);
    if (!match) continue;
    const key = match[1];
    const value = match[2].trim().replace(/^['"]|['"]$/g, "");
    entries[key] = value;
  }
  return entries;
}

function loadLocalEnv(filePath: string): Record<string, string> {
  if (!fs.existsSync(filePath)) {
    fail(`Missing source env file: ${path.relative(root, filePath)}`);
  }

  const result = loadEnv({ path: filePath, override: false });
  if (result.error) {
    fail(`Unable to parse ${path.relative(root, filePath)}: ${result.error.message}`);
  }

  return Object.fromEntries(
    Object.entries(result.parsed ?? {}).filter(([, value]) => typeof value === "string"),
  ) as Record<string, string>;
}

function downloadSecrets(config: string, project?: string): Record<string, unknown> {
  const args = ["secrets", "download", "--no-file", "--format", "json", "--config", config];
  if (project) args.push("--project", project);

  const proc = spawnSync("doppler", args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });

  if (proc.status !== 0) {
    const details = (proc.stderr || proc.stdout || "unknown error").trim();
    fail(`Cannot read Doppler config '${config}': ${details}`);
  }

  try {
    return JSON.parse(proc.stdout || "{}");
  } catch (error) {
    fail(`Invalid JSON for Doppler config '${config}': ${(error as Error).message}`);
  }
}

function setSecret(config: string, key: string, value: string, project?: string) {
  const args = ["secrets", "set", `${key}=${value}`, "--config", config];
  if (project) args.push("--project", project);

  const proc = spawnSync("doppler", args, {
    cwd: root,
    encoding: "utf8",
    env: process.env,
  });

  if (proc.status !== 0) {
    const details = (proc.stderr || proc.stdout || "unknown error").trim();
    fail(`Failed setting '${key}' in config '${config}': ${details}`);
  }
}

function parseConfigs(): string[] {
  const raw = process.env.DOPPLER_CONFIGS ?? "dev";
  const parsed = raw
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
  return parsed.length > 0 ? parsed : ["dev"];
}

function resolveValue(
  key: string,
  sourceEnv: Record<string, string>,
  fallbackEnv: Record<string, string>,
): string | undefined {
  if (sourceEnv[key]) return sourceEnv[key];
  if (key === "SENTRY_DSN" && sourceEnv.NEXT_PUBLIC_SENTRY_DSN) {
    return sourceEnv.NEXT_PUBLIC_SENTRY_DSN;
  }
  if (fallbackEnv[key]) return fallbackEnv[key];
  return undefined;
}

function main() {
  const requiredEntries = getRequiredEntries(envExamplePath);
  const requiredKeys = Object.keys(requiredEntries);
  const sourceEnv = loadLocalEnv(envLocalPath);
  const project = process.env.DOPPLER_PROJECT?.trim() || undefined;
  const configs = parseConfigs();

  for (const config of configs) {
    const current = downloadSecrets(config, project);
    const missing = requiredKeys.filter((key) => !(key in current));

    if (missing.length === 0) {
      console.log(`Config '${config}' already has all required keys.`);
      continue;
    }

    const missingSource = missing.filter(
      (key) => !resolveValue(key, sourceEnv, requiredEntries),
    );
    if (missingSource.length > 0) {
      fail(
        `Source env is missing ${missingSource.length} key(s) required for Doppler '${config}': ${missingSource.join(", ")}`,
      );
    }

    for (const key of missing) {
      const value = resolveValue(key, sourceEnv, requiredEntries);
      if (!value) {
        fail(`Unable to resolve value for '${key}' in config '${config}'.`);
      }
      setSecret(config, key, value, project);
    }

    console.log(`Config '${config}' synced ${missing.length} missing key(s).`);
  }

  console.log("Doppler sync completed.");
}

main();
