#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const target = path.join(root, "apps/app/next-env.d.ts");

if (!fs.existsSync(target)) {
  console.log("[normalize-next-env] apps/app/next-env.d.ts not found; skipping");
  process.exit(0);
}

const original = fs.readFileSync(target, "utf8");
const normalized = original.replace(
  /import\s+["']\.\/\.next\/(?:dev\/)?types\/routes\.d\.ts["'];?/,
  'import "./.next/types/routes.d.ts";',
);

if (normalized !== original) {
  fs.writeFileSync(target, normalized, "utf8");
  console.log("[normalize-next-env] normalized apps/app/next-env.d.ts route import");
} else {
  console.log("[normalize-next-env] no changes needed");
}
