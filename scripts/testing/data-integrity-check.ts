import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const reportPath = path.join(root, "docs/testing/DATA_INTEGRITY.json");

const migrationDirs = ["apps/app/db/migrations", "apps/app/supabase/migrations"];
const checks: Record<string, unknown> = {
  migrationFiles: 0,
  hasRlsPolicies: false,
  hasTenantIsolationMigration: false,
  hasRollbackScripts: false,
};

let migrationFiles: string[] = [];
for (const dir of migrationDirs) {
  const abs = path.join(root, dir);
  if (!fs.existsSync(abs)) continue;
  migrationFiles = migrationFiles.concat(
    fs
      .readdirSync(abs)
      .filter((f) => f.endsWith(".sql") || f.endsWith(".json"))
      .map((f) => `${dir}/${f}`),
  );
}

checks.migrationFiles = migrationFiles.length;
checks.hasRlsPolicies = migrationFiles.some((f) => /rls|policy|isolation/i.test(f));
checks.hasTenantIsolationMigration = migrationFiles.some((f) => /tenant_isolation|multi_tenant|isolation/i.test(f));
checks.hasRollbackScripts = fs.existsSync(path.join(root, "run-migrations.sh"));

const result = {
  generatedAt: new Date().toISOString(),
  checks,
  pass:
    Number(checks.migrationFiles) > 0 &&
    checks.hasRlsPolicies === true &&
    checks.hasTenantIsolationMigration === true,
};

fs.mkdirSync(path.dirname(reportPath), { recursive: true });
fs.writeFileSync(reportPath, JSON.stringify(result, null, 2));

if (!result.pass) {
  console.error("Data integrity check failed", result);
  process.exit(1);
}

console.log("Data integrity check passed");
