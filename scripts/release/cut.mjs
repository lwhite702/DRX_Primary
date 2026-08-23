#!/usr/bin/env node

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const version = process.argv[2];
const current = readFileSync(join(root, "VERSION"), "utf8").trim();
if (!version || version !== current) {
  console.error(`Usage: pnpm release:cut ${current}`);
  process.exit(1);
}

const changelogPath = join(root, "CHANGELOG.md");
const changelog = readFileSync(changelogPath, "utf8");
if (new RegExp(`^## \\[${version.replaceAll(".", "\\.")}\\]`, "m").test(changelog)) {
  console.error(`CHANGELOG.md already contains release ${version}.`);
  process.exit(1);
}
const match = changelog.match(/^## \[Unreleased\]\s*\n([\s\S]*?)(?=^## \[)/m);
if (!match || !match[1].trim()) {
  console.error("[Unreleased] must contain verified entries before a release cut.");
  process.exit(1);
}

const date = new Date().toISOString().slice(0, 10);
writeFileSync(
  changelogPath,
  changelog.replace(/^## \[Unreleased\]\s*$/m, `## [Unreleased]\n\n## [${version}] - ${date}`),
);

const draftDir = join(root, "docs", "help-center-export", "changelog", "drafts");
mkdirSync(draftDir, { recursive: true });
writeFileSync(
  join(draftDir, `${version}.md`),
  `# DRX ${version} customer changelog draft\n\nStatus: Draft - publication requires approval and release evidence.\n\nSource implementation notes:\n\n${match[1].trim()}\n`,
);
console.log(`Cut local ${version} changelog section and customer draft for ${date}.`);
console.log("No tag, release, deployment, store submission, or publication was created.");
