#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const REQUIRED_NODE = "22.23.1";

function run(command, args) {
  const result = spawnSync(command, args, {
    cwd: root,
    stdio: "inherit",
    shell: false,
  });

  if (result.status !== 0) {
    process.exit(result.status ?? 1);
  }
}

function assertNodeVersion() {
  const actual = process.versions.node;
  if (actual !== REQUIRED_NODE) {
    console.error(
      `[preflight] Node.js ${REQUIRED_NODE} is required, current is ${actual}. Run \`nvm use\` before release checks.`,
    );
    process.exit(1);
  }
  console.log(`[preflight] Node.js version OK (${actual})`);
}

function assertRootInstallCommand() {
  const rootVercelPath = join(root, "vercel.json");
  const appVercelPath = join(root, "apps/app/vercel.json");

  const rootVercel = JSON.parse(readFileSync(rootVercelPath, "utf8"));
  const appVercel = JSON.parse(readFileSync(appVercelPath, "utf8"));

  const expected =
    "corepack enable && corepack prepare pnpm@9.15.9 --activate && pnpm install --frozen-lockfile";

  if (rootVercel.installCommand !== expected) {
    console.error("[preflight] Root vercel installCommand is not release-safe.");
    console.error(`[preflight] expected: ${expected}`);
    console.error(`[preflight] actual:   ${rootVercel.installCommand}`);
    process.exit(1);
  }

  if (appVercel.installCommand !== expected) {
    console.error("[preflight] apps/app vercel installCommand is not release-safe.");
    console.error(`[preflight] expected: ${expected}`);
    console.error(`[preflight] actual:   ${appVercel.installCommand}`);
    process.exit(1);
  }

  console.log("[preflight] Vercel install commands are pinned to frozen pnpm install");
}

assertNodeVersion();
assertRootInstallCommand();
run("node", ["scripts/release/normalize-next-env.mjs"]);
run("pnpm", ["install", "--frozen-lockfile"]);
run("pnpm", ["version:check"]);
console.log("[preflight] release baseline checks passed");
