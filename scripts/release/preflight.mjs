#!/usr/bin/env node

import { readFileSync } from "node:fs";
import { join } from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const REQUIRED_NODE_MAJOR = 20;
const REQUIRED_NODE_MINOR = 19;

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
  const [major, minor] = actual.split(".").map(Number);
  if (major !== REQUIRED_NODE_MAJOR || minor < REQUIRED_NODE_MINOR) {
    console.error(
      `[preflight] Node.js ${REQUIRED_NODE_MAJOR}.${REQUIRED_NODE_MINOR}+ is required within major ${REQUIRED_NODE_MAJOR}; current is ${actual}. Run \`nvm use\` before release checks.`,
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

  const expectedRoot =
    "corepack enable && corepack prepare pnpm@9.15.9 --activate && pnpm install --frozen-lockfile";
  const expectedApp = `cd ../.. && ${expectedRoot}`;

  if (rootVercel.installCommand !== expectedRoot) {
    console.error("[preflight] Root vercel installCommand is not release-safe.");
    console.error(`[preflight] expected: ${expectedRoot}`);
    console.error(`[preflight] actual:   ${rootVercel.installCommand}`);
    process.exit(1);
  }

  if (appVercel.installCommand !== expectedApp) {
    console.error("[preflight] apps/app vercel installCommand is not release-safe.");
    console.error(`[preflight] expected: ${expectedApp}`);
    console.error(`[preflight] actual:   ${appVercel.installCommand}`);
    process.exit(1);
  }

  console.log("[preflight] Vercel install commands are pinned to frozen pnpm install");
}

assertNodeVersion();
assertRootInstallCommand();
run("node", ["scripts/release/normalize-next-env.mjs"]);
run("corepack", ["pnpm", "install", "--frozen-lockfile"]);
run("corepack", ["pnpm", "version:check"]);
console.log("[preflight] release baseline checks passed");
