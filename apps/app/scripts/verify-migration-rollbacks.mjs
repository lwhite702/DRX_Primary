#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";

const migrationsDir = path.resolve(process.cwd(), "db/migrations");
const ENFORCEMENT_CUTOFF = 20260405000000;

const files = fs.readdirSync(migrationsDir);
const upMigrations = files.filter(
  (name) =>
    /^\d+.*\.sql$/.test(name) &&
    !name.endsWith(".down.sql"),
);

const requiredMissing = [];
const legacyMissing = [];

for (const upFile of upMigrations) {
  const timestamp = Number(upFile.slice(0, 14));
  const downFile = upFile.replace(/\.sql$/, ".down.sql");
  const hasDown = files.includes(downFile);

  if (hasDown) {
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

console.log(
  `[migration-rollbacks] OK. Enforced from ${ENFORCEMENT_CUTOFF}; checked ${upMigrations.length} migration files.`,
);
