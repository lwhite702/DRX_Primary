import fs from "node:fs";
import path from "node:path";

type RegistryFlag = {
  id: string;
  description: string;
  defaultGlobalEnabled: boolean;
  rollout: "global" | "staged";
};

type Registry = {
  version: string;
  flags: RegistryFlag[];
};

type SqlSeedFlag = {
  id: string;
  description: string;
  is_global_enabled: boolean;
};

const root = process.cwd();
const registryPath = path.join(root, "scripts/testing/feature-flags.registry.json");
const migrationPath = path.join(
  root,
  "apps/app/supabase/migrations/20251227000001_feature_flags.sql",
);
const featuresClientPath = path.join(
  root,
  "apps/app/app/(app)/admin/features/_components/FeaturesClient.tsx",
);

function fail(message: string): never {
  console.error(`Feature flags parity check failed: ${message}`);
  process.exit(1);
}

function loadRegistry(): Registry {
  if (!fs.existsSync(registryPath)) fail("Missing canonical registry file");
  const parsed = JSON.parse(fs.readFileSync(registryPath, "utf8")) as Registry;
  if (!Array.isArray(parsed.flags) || parsed.flags.length === 0) {
    fail("Registry has no flags");
  }
  return parsed;
}

function parseSqlSeeds(sql: string): SqlSeedFlag[] {
  const start = sql.indexOf("INSERT INTO feature_flags");
  if (start < 0) return [];

  const fragment = sql.slice(start, start + 2500);
  const rows = [...fragment.matchAll(/\('([^']+)'\s*,\s*'([^']+)'\s*,\s*(TRUE|FALSE)\)/g)];

  return rows.map((m) => ({
    id: m[1],
    description: m[2],
    is_global_enabled: m[3] === "TRUE",
  }));
}

function main() {
  const registry = loadRegistry();

  if (!fs.existsSync(migrationPath)) fail("Missing feature flag migration");
  const sql = fs.readFileSync(migrationPath, "utf8");
  const sqlSeeds = parseSqlSeeds(sql);

  if (sqlSeeds.length === 0) fail("No feature_flags seed rows found in migration");

  const byRegistry = new Map(registry.flags.map((f) => [f.id, f]));
  const bySql = new Map(sqlSeeds.map((f) => [f.id, f]));

  for (const id of byRegistry.keys()) {
    if (!bySql.has(id)) fail(`Registry flag missing from SQL seed: ${id}`);
  }

  for (const id of bySql.keys()) {
    if (!byRegistry.has(id)) fail(`SQL seed flag missing from registry: ${id}`);
  }

  for (const [id, reg] of byRegistry) {
    const sqlFlag = bySql.get(id)!;
    if (reg.description !== sqlFlag.description) {
      fail(`Description mismatch for '${id}'`);
    }
    if (reg.defaultGlobalEnabled !== sqlFlag.is_global_enabled) {
      fail(`defaultGlobalEnabled mismatch for '${id}'`);
    }
  }

  if (!fs.existsSync(featuresClientPath)) fail("Missing admin FeaturesClient surface");
  const featuresClient = fs.readFileSync(featuresClientPath, "utf8");
  if (!featuresClient.includes("feature_flags")) {
    fail("Admin FeaturesClient does not reference feature_flags table");
  }

  console.log(
    `Feature flags parity check passed (${registry.version}) with ${registry.flags.length} flags.`,
  );
}

main();
