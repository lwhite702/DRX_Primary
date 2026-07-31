#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.resolve(process.cwd(), "db/migrations");
const ENFORCEMENT_CUTOFF = 20260405000000;
const intentionallyIrreversible = new Set([
  "20260405000001_remove_pos_manager_pin_default.down.sql",
]);

const files = fs.readdirSync(migrationsDir);
const upMigrations = files.filter(
  (name) =>
    /^\d+.*\.sql$/.test(name) &&
    !name.endsWith(".down.sql"),
);

const requiredMissing = [];
const legacyMissing = [];
const invalidRollbacks = [];

function executableSql(contents) {
  return contents
    .replace(/\/\*[\s\S]*?\*\//g, " ")
    .replace(/--.*$/gm, " ")
    .trim();
}

function hasRollbackOperation(contents) {
  return /\b(ALTER|CREATE|DELETE|DO|DROP|GRANT|INSERT|REVOKE|TRUNCATE|UPDATE)\b/i.test(
    executableSql(contents),
  );
}

for (const upFile of upMigrations) {
  const timestamp = Number(upFile.slice(0, 14));
  const downFile = upFile.replace(/\.sql$/, ".down.sql");
  const hasDown = files.includes(downFile);

  if (hasDown) {
    const downContents = fs.readFileSync(
      path.join(migrationsDir, downFile),
      "utf8",
    );
    const isApprovedIrreversible = intentionallyIrreversible.has(downFile);

    if (
      executableSql(downContents).length === 0 ||
      (!hasRollbackOperation(downContents) && !isApprovedIrreversible)
    ) {
      invalidRollbacks.push({
        downFile,
        reason: "contains no rollback operation",
      });
    }

    if (
      isApprovedIrreversible &&
      !/\birreversible\b/i.test(downContents)
    ) {
      invalidRollbacks.push({
        downFile,
        reason: "approved irreversible rollback is missing its warning",
      });
    }

    continue;
  }

  if (Number.isFinite(timestamp) && timestamp >= ENFORCEMENT_CUTOFF) {
    requiredMissing.push({ upFile, downFile });
  } else {
    legacyMissing.push({ upFile, downFile });
  }
}

if (legacyMissing.length > 0) {
  console.warn(
    `[migration-rollbacks] Legacy migrations without .down.sql: ${legacyMissing.length}`,
  );
  for (const item of legacyMissing) {
    console.warn(`  - ${item.upFile} (expected ${item.downFile})`);
  }
}

if (requiredMissing.length > 0) {
  console.error(
    `[migration-rollbacks] Missing required rollback files: ${requiredMissing.length}`,
  );
  for (const item of requiredMissing) {
    console.error(`  - ${item.upFile} (expected ${item.downFile})`);
  }
  process.exit(1);
}

if (invalidRollbacks.length > 0) {
  console.error(
    `[migration-rollbacks] Invalid rollback files: ${invalidRollbacks.length}`,
  );
  for (const item of invalidRollbacks) {
    console.error(`  - ${item.downFile}: ${item.reason}`);
  }
  process.exit(1);
}

console.log(
  `[migration-rollbacks] OK. Enforced from ${ENFORCEMENT_CUTOFF}; checked ${upMigrations.length} migration files and ${files.filter((name) => name.endsWith(".down.sql")).length} rollback files.`,
);
