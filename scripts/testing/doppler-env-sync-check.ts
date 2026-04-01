import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type DopplerSecrets = Record<string, unknown>;

const root = process.cwd();
const envExamplePath = path.join(root, "apps/app/.env.example");
const defaultConfigs = ["dev"];

function fail(message: string): never {
  console.error(`Doppler sync check failed: ${message}`);
  process.exit(1);
}

function parseRequiredKeys(filePath: string): string[] {
  if (!fs.existsSync(filePath)) {
    fail(`Missing env template: ${path.relative(root, filePath)}`);
  }

  const text = fs.readFileSync(filePath, "utf8");
  return Array.from(
    new Set(
      text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0 && !line.startsWith("#"))
        .map((line) => line.match(/^([A-Z0-9_]+)\s*=/)?.[1])
        .filter((key): key is string => Boolean(key)),
    ),
  );
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

function fetchSecrets(config: string, project?: string): DopplerSecrets {
  const args = ["secrets", "download", "--no-file", "--format", "json", "--config", config];
  if (project) {
    args.push("--project", project);
  }

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
    const parsed = JSON.parse(proc.stdout || "{}") as DopplerSecrets;
    return parsed;
  } catch (error) {
    fail(`Invalid JSON returned by Doppler for config '${config}'. ${(error as Error).message}`);
  }
}

function checkConfig(config: string, requiredKeys: string[], project?: string) {
  const secrets = fetchSecrets(config, project);
  const missing = requiredKeys.filter((key) => !(key in secrets));

  if (missing.length > 0) {
    fail(
      `Config '${config}' is missing ${missing.length} key(s): ${missing.join(", ")}`,
    );
  }

  console.log(`Doppler config '${config}' includes all ${requiredKeys.length} required key(s).`);
}

function main() {
  ensureDopplerAvailable();

  const requiredKeys = parseRequiredKeys(envExamplePath);
  if (requiredKeys.length === 0) {
    fail("No required keys found in apps/app/.env.example");
  }

  const project = process.env.DOPPLER_PROJECT?.trim() || undefined;
  const configs = parseConfigs(process.env.DOPPLER_CONFIGS);

  for (const config of configs) {
    checkConfig(config, requiredKeys, project);
  }

  console.log("Doppler env sync check passed.");
}

main();
