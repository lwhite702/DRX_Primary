#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const ROOT = process.cwd();
const SCAN_DIRS = [
  "apps/app/app",
  "apps/app/components",
  "apps/app/lib/copy",
];
const ALLOWED_EXT = new Set([".ts", ".tsx", ".js", ".jsx", ".json", ".md"]);
const IGNORE_DIRS = new Set([
  "node_modules",
  ".next",
  "coverage",
  "dist",
  "build",
  "playwright-report",
  "test-results",
]);

const bannedTerms = [
  "drug",
  "dealer",
  "stash",
  "trap",
  "coke",
  "pills",
  "weed",
  "cops",
  "police",
  "feds",
  "law enforcement",
  "get caught",
  "hide your",
  "evade",
  "subpoena-proof",
];

const jargonTerms = [
  "enterprise",
  "synergy",
  "robust",
  "scalable",
  "methodology",
  "authenticate",
  "immutable",
  "omnichannel",
  "leverage",
];

function escapeRegex(term) {
  return term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const checks = [
  ...bannedTerms.map((term) => ({ type: "banned", term, re: new RegExp(`\\b${escapeRegex(term)}\\b`, "i") })),
  ...jargonTerms.map((term) => ({ type: "jargon", term, re: new RegExp(`\\b${escapeRegex(term)}\\b`, "i") })),
];

function walk(dir, out) {
  if (!fs.existsSync(dir)) return;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!IGNORE_DIRS.has(entry.name)) walk(full, out);
      continue;
    }
    if (ALLOWED_EXT.has(path.extname(entry.name))) out.push(full);
  }
}

function canUseIgnoreDirective(relPath) {
  return relPath.startsWith("docs/") || relPath.endsWith(".md");
}

const files = [];
for (const dir of SCAN_DIRS) walk(path.join(ROOT, dir), files);

const violations = [];
for (const file of files) {
  if (file.endsWith("scripts/copy-lint.js")) continue;
  const relPath = path.relative(ROOT, file).split(path.sep).join("/");
  const lines = fs.readFileSync(file, "utf8").split(/\r?\n/);

  lines.forEach((line, idx) => {
    const trimmed = line.trim();
    if (
      trimmed.startsWith("//") ||
      trimmed.startsWith("/*") ||
      trimmed.startsWith("*") ||
      trimmed.startsWith("{/*") ||
      trimmed.startsWith("*/")
    ) {
      return;
    }
    const hasIgnore = line.includes("copy-lint: ignore");
    if (hasIgnore && !canUseIgnoreDirective(relPath)) {
      violations.push({
        type: "invalid-ignore",
        term: "copy-lint: ignore",
        file: relPath,
        line: idx + 1,
        text: line.trim(),
      });
      return;
    }
    if (hasIgnore) return;

    for (const check of checks) {
      if (check.re.test(line)) {
        violations.push({
          type: check.type,
          term: check.term,
          file: relPath,
          line: idx + 1,
          text: line.trim(),
        });
      }
    }
  });
}

if (violations.length > 0) {
  console.error("❌ Copy lint failed. Terms not allowed in user-facing copy:");
  for (const v of violations) {
    console.error(`- [${v.type}] ${v.file}:${v.line} -> "${v.term}"`);
    console.error(`  ${v.text}`);
  }
  process.exit(1);
}

console.log("✅ Copy lint passed.");
