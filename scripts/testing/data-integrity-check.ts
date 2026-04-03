import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs/testing");
const outputPath = path.join(docsDir, "DATA_INTEGRITY.json");

const migrationDirs = ["apps/app/db/migrations", "apps/app/supabase/migrations"];

function walkFiles(base: string, extRegex: RegExp): string[] {
  const out: string[] = [];
  const absolute = path.join(root, base);
  if (!fs.existsSync(absolute)) return out;

  const stack = [absolute];
  while (stack.length) {
    const current = stack.pop()!;
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", ".next", "dist", "tests"].includes(entry.name)) continue;
        stack.push(full);
        continue;
      }
      if (extRegex.test(entry.name)) {
        out.push(path.relative(root, full).replace(/\\/g, "/"));
      }
    }
  }

  return out;
}

function listSqlFiles(dir: string): string[] {
  return walkFiles(dir, /\.sql$/i);
}

function countTenantSignals(files: string[]): { filesWithTenantSignal: number; filesWithBusinessFilter: number; filesWithOrgSignal: number } {
  let filesWithTenantSignal = 0;
  let filesWithBusinessFilter = 0;
  let filesWithOrgSignal = 0;

  for (const file of files) {
    const text = fs.readFileSync(path.join(root, file), "utf8");

    if (/tenant/i.test(text)) filesWithTenantSignal += 1;
    if (/business_id|businessId|eq\(["']business_id["']/.test(text)) filesWithBusinessFilter += 1;
    if (/organization|org_id|orgId|clerkOrgId/i.test(text)) filesWithOrgSignal += 1;
  }

  return { filesWithTenantSignal, filesWithBusinessFilter, filesWithOrgSignal };
}

function backupRestoreSimulationReady(): boolean {
  const candidates = [
    "scripts/backup",
    "scripts/restore",
    "apps/app/scripts/backup",
    "apps/app/scripts/restore",
  ];
  return candidates.some((c) => fs.existsSync(path.join(root, c)));
}

function rollbackPlaybookReady(): boolean {
  const candidates = [
    "docs/ROLLBACK.md",
    "docs/testing/ROLLBACK_PLAYBOOK.md",
    "CHECKLIST_PRERELEASE.md",
  ];
  return candidates.some((c) => fs.existsSync(path.join(root, c)));
}

function main() {
  const migrations = migrationDirs.flatMap(listSqlFiles);
  const apiFiles = walkFiles("apps/app/app/api", /\.(ts|tsx|sql|prisma)$/);
  const actionFiles = walkFiles("apps/app/app/actions", /\.(ts|tsx|sql|prisma)$/);
  const libFiles = walkFiles("apps/app/lib", /\.(ts|tsx|sql|prisma)$/);
  const tenantSignals = countTenantSignals([...apiFiles, ...actionFiles, ...libFiles]);

  const tenantGuardSignalsPresent =
    tenantSignals.filesWithBusinessFilter >= 5 &&
    (tenantSignals.filesWithTenantSignal >= 2 || tenantSignals.filesWithOrgSignal >= 2);

  const result = {
    schemaVersion: "3.0.0",
    generatedAt: new Date().toISOString(),
    migrationVerification: {
      migrationFiles: migrations,
      hasMigrations: migrations.length > 0,
      reversibleCheck: "manual-review-required",
      schemaDriftCheck: "manual-review-required",
    },
    tenantIsolation: {
      tenantGuardSignalsPresent,
      evidence: tenantSignals,
    },
    backupRestore: {
      simulationAssetsPresent: backupRestoreSimulationReady(),
    },
    rollbackSafety: {
      playbookPresent: rollbackPlaybookReady(),
    },
  };

  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));

  const pass =
    result.migrationVerification.hasMigrations &&
    result.tenantIsolation.tenantGuardSignalsPresent &&
    result.rollbackSafety.playbookPresent;

  if (!pass) {
    console.error("Data integrity check failed", result);
    process.exit(1);
  }

  console.log("Data integrity check passed");
}

main();
