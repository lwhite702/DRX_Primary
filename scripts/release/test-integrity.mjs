#!/usr/bin/env node

import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { createRequire } from "node:module";
import { existsSync, mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import {
  classifyEvidenceState,
  classifyReleaseImpact,
  parseImpact,
  validateChangelog,
  validateCiDependencyPolicy,
  validateCiDependencyReferences,
  validateDeclaredImpact,
  validateImpactChanges,
  validatePullRequest,
} from "./integrity-check.mjs";

const require = createRequire(import.meta.url);
const { prepare, validate: validateVersions } = require("../version.js");

const tempRoots = new Set();

function registerTempDir(dir) {
  tempRoots.add(dir);
  return dir;
}

function cleanup() {
  for (const dir of tempRoots) {
    try {
      if (existsSync(dir)) {
        rmSync(dir, { recursive: true, force: true });
      }
    } catch {
      // Ignore cleanup errors
    }
  }
  tempRoots.clear();
}

process.on("exit", cleanup);

function write(root, relative, value) {
  const target = join(root, relative);
  mkdirSync(dirname(target), { recursive: true });
  writeFileSync(target, value);
}

function versionFixture(overrides = {}) {
  const root = registerTempDir(mkdtempSync(join(tmpdir(), "drx-release-integrity-")));
  const version = overrides.version ?? "0.6.0";
  write(root, "VERSION", `${version}\n`);
  for (const relative of ["package.json", "apps/app/package.json", "apps/mobile/package.json"]) {
    write(root, relative, `${JSON.stringify({ version: overrides[relative] ?? version })}\n`);
  }
  write(root, "apps/mobile/app.json", `${JSON.stringify({ expo: { version, android: {} } })}\n`);
  write(root, "apps/mobile/eas.json", `${JSON.stringify({ cli: { appVersionSource: "remote" } })}\n`);
  write(root, "apps/ios/project.yml", `CURRENT_PROJECT_VERSION: 31\nMARKETING_VERSION: ${version}\n`);
  write(root, "apps/ios/DRXApp.xcodeproj/project.pbxproj", `CURRENT_PROJECT_VERSION = 31;\nMARKETING_VERSION = ${version};\nCURRENT_PROJECT_VERSION = 31;\nMARKETING_VERSION = ${version};\n`);
  write(root, "apps/app/app/(app)/settings/page.tsx", "const label = appPackage.version;\n");
  write(root, "apps/mobile/app/(tabs)/more.tsx", "const label = Application.nativeApplicationVersion;\n");
  write(root, "apps/mobile/src/contexts/OfflineContext.tsx", 'const appVersion = Application.nativeApplicationVersion ?? "unknown";\n');
  return root;
}

const clean = versionFixture();
assert.deepEqual(validateVersions(clean, { quiet: true }).errors, []);

const mismatch = versionFixture({ "apps/mobile/package.json": "0.5.8" });
assert.match(validateVersions(mismatch, { quiet: true }).errors.join("\n"), /apps\/mobile\/package\.json/);

const hardcoded = versionFixture();
write(hardcoded, "apps/mobile/app/(tabs)/more.tsx", "const label = 'v0.6.0';\n");
assert.match(validateVersions(hardcoded, { quiet: true }).errors.join("\n"), /embeds a SemVer literal/);

const prepared = versionFixture({ version: "0.5.8" });
prepare(prepared, "0.6.0");
assert.deepEqual(validateVersions(prepared, { quiet: true }).errors, []);
assert.match(readFileSync(join(prepared, "apps/ios/project.yml"), "utf8"), /CURRENT_PROJECT_VERSION: 31/);

const validChangelog = "# Changelog\n\n## [Unreleased]\n\n### Added\n\n- Work.\n\n## [0.5.8] - 2026-08-20\n";
const changedUnreleased = validChangelog.replace("- Work.", "- Work.\n- Added a customer-visible delivery queue.");
const unsupportedPrerelease = changedUnreleased.replace("0.5.8", "0.6.0-rc.1");
assert.deepEqual(validateChangelog(validChangelog, "0.6.0", new Date("2026-08-21T23:00:00Z")).errors, []);
assert.match(validateChangelog(unsupportedPrerelease, "0.6.0").errors.join("\n"), /Unsupported prerelease/);
assert.match(validateChangelog(validChangelog.replace("2026-08-20", "2999-01-01"), "0.6.0").errors.join("\n"), /future date/);

assert.deepEqual(parseImpact("Release impact: minor\nRoadmap impact: add"), { release: "minor", roadmap: "add" });
assert.match(validateImpactChanges({ release: "minor", roadmap: "none" }, []).join("\n"), /CHANGELOG\.md/);
assert.match(validateImpactChanges({ release: "none", roadmap: "move" }, []).join("\n"), /customer roadmap/);
assert.deepEqual(validateImpactChanges(
  { release: "minor", roadmap: "add" },
  ["CHANGELOG.md", "docs/help-center-export/roadmap/customer-roadmap.md"],
  { baseChangelog: validChangelog, headChangelog: changedUnreleased },
), []);

const versionDiff = [
  "diff --git a/VERSION b/VERSION",
  "--- a/VERSION",
  "+++ b/VERSION",
  "@@ -1 +1 @@",
  "-0.5.8",
  "+0.6.0",
].join("\n");
assert.match(
  validateImpactChanges(
    { release: "none", roadmap: "none" },
    ["VERSION"],
    { baseChangelog: validChangelog, headChangelog: validChangelog, diff: versionDiff },
  ).join("\n"),
  /Release impact none cannot edit version surfaces: VERSION/,
);
assert.match(
  validateImpactChanges(
    { release: "minor", roadmap: "none" },
    ["CHANGELOG.md"],
    { baseChangelog: validChangelog, headChangelog: validChangelog },
  ).join("\n"),
  /substantive diff in the leading \[Unreleased\]/,
);

assert.equal(classifyReleaseImpact({ removesPublicContract: true, currentVersion: "0.6.0" }), "major");
assert.deepEqual(validateDeclaredImpact("major", "patch"), [
  "Declared Release impact patch does not match required major.",
]);

const remoteMcp = [{ source: ".github/workflows/version.yml:99", command: "run: pnpm dlx hapi-release-mcp" }];
assert.match(
  validateCiDependencyReferences(remoteMcp, {
    allowedLocalMcpDependencies: [{ ...remoteMcp[0], localPath: "scripts/mcp/release.mjs" }],
  }, () => true).join("\n"),
  /Opaque or ephemeral remote MCP dependency/,
);
const localMcp = [{ source: ".github/workflows/version.yml:99", command: "run: node scripts/mcp/release.mjs" }];
assert.match(
  validateCiDependencyReferences(localMcp, { allowedLocalMcpDependencies: [] }, () => true).join("\n"),
  /not an approved local repository dependency/,
);
assert.deepEqual(validateCiDependencyReferences(localMcp, {
  allowedLocalMcpDependencies: [{ ...localMcp[0], localPath: "scripts/mcp/release.mjs" }],
}, (path) => path === "scripts/mcp/release.mjs"), []);
assert.deepEqual(validateCiDependencyPolicy(process.cwd()), []);

function changelogFor(mode) {
  if (mode === "unreleased-changed") return changedUnreleased;
  if (mode === "unsupported-prerelease") return unsupportedPrerelease;
  return validChangelog;
}

const forwardCases = JSON.parse(readFileSync(join(import.meta.dirname, "fixtures", "skill-forward-tests.json"), "utf8"));
assert.equal(forwardCases.length, 6);
for (const fixture of forwardCases) {
  const state = classifyEvidenceState(fixture.evidence);
  const requiredImpact = classifyReleaseImpact(fixture.change);
  const headChangelog = changelogFor(fixture.changelogMode);
  const errors = [
    ...validateDeclaredImpact(requiredImpact, fixture.declaredImpact),
    ...validateImpactChanges(
      { release: fixture.declaredImpact, roadmap: "none" },
      fixture.changedFiles,
      { baseChangelog: validChangelog, headChangelog },
    ),
  ];
  if (fixture.changelogMode === "unsupported-prerelease") {
    errors.push(...validateChangelog(headChangelog, "0.6.0").errors);
  }
  if (fixture.versionOverrides) {
    errors.push(...validateVersions(versionFixture(fixture.versionOverrides), { quiet: true }).errors);
  }
  if (fixture.ciReferences) {
    errors.push(...validateCiDependencyReferences(
      fixture.ciReferences,
      { allowedLocalMcpDependencies: [] },
      () => false,
    ));
  }
  assert.equal(state, fixture.expected.state, `${fixture.id}: evidence state`);
  assert.equal(requiredImpact, fixture.expected.requiredImpact, `${fixture.id}: SemVer impact`);
  if (!fixture.expected.errors.length) {
    assert.deepEqual(errors, [], `${fixture.id}: unexpected errors`);
  } else {
    for (const expected of fixture.expected.errors) {
      assert.ok(errors.some((error) => error.includes(expected)), `${fixture.id}: missing error containing ${expected}\n${errors.join("\n")}`);
    }
  }
}

const breakingPrRoot = registerTempDir(mkdtempSync(join(tmpdir(), "drx-release-breaking-pr-")));
const git = (args) => {
  const result = spawnSync("git", args, { cwd: breakingPrRoot, encoding: "utf8" });
  assert.equal(result.status, 0, result.stderr);
  return result.stdout.trim();
};
git(["init", "--quiet"]);
write(breakingPrRoot, "CHANGELOG.md", validChangelog);
write(breakingPrRoot, "src/public-api.ts", "export function legacyExport() { return true; }\n");
git(["add", "CHANGELOG.md", "src/public-api.ts"]);
git(["-c", "user.name=Release Integrity", "-c", "user.email=release-integrity@example.invalid", "commit", "--quiet", "-m", "base"]);
const breakingPrBase = git(["rev-parse", "HEAD"]);
write(breakingPrRoot, "CHANGELOG.md", changedUnreleased);
write(breakingPrRoot, "src/public-api.ts", "function keptInternal() { return true; }\n");
git(["add", "CHANGELOG.md", "src/public-api.ts"]);
git(["-c", "user.name=Release Integrity", "-c", "user.email=release-integrity@example.invalid", "commit", "--quiet", "-m", "breaking export removal"]);
const breakingPrErrors = validatePullRequest(breakingPrRoot, {
  pull_request: {
    base: { sha: breakingPrBase },
    body: "Release impact: patch\nRoadmap impact: none",
  },
});
assert.match(
  breakingPrErrors.join("\n"),
  /Declared Release impact patch does not match required major/,
  "actual PR validation must reject a breaking export removal declared as patch",
);

const structuralSignalIds = [
  "export-contract-changed:src/public-api.ts:calculate",
  "export-contract-removed:src/public-types.ts:PublicLine",
  "export-contract-removed:src/old-module.ts:movedApi",
  "persisted-schema-destructive-edit:prisma/schema.prisma",
];

function structuralPrFixture(withReviewManifest) {
  const root = registerTempDir(mkdtempSync(join(tmpdir(), "drx-release-structural-pr-")));
  const runGit = (args) => {
    const result = spawnSync("git", args, { cwd: root, encoding: "utf8" });
    assert.equal(result.status, 0, result.stderr);
    return result.stdout.trim();
  };
  runGit(["init", "--quiet"]);
  write(root, "CHANGELOG.md", validChangelog);
  write(root, "src/public-api.ts", "export function calculate(value: string): number {\n  return value.length;\n}\n");
  write(root, "src/public-types.ts", "export type PublicLine = {\n  amount: number;\n};\n");
  write(root, "src/old-module.ts", "export function movedApi(): string {\n  return 'old';\n}\n");
  write(root, "prisma/schema.prisma", "model Sale {\n  id String @id\n  total Int\n}\n");
  runGit(["add", "."]);
  runGit(["-c", "user.name=Release Integrity", "-c", "user.email=release-integrity@example.invalid", "commit", "--quiet", "-m", "base"]);
  const baseSha = runGit(["rev-parse", "HEAD"]);

  write(root, "CHANGELOG.md", changedUnreleased);
  write(root, "src/public-api.ts", "export function calculate(value: number): number {\n  return value;\n}\n");
  write(root, "src/public-types.ts", "const internalLine = { amount: 0 };\n");
  write(root, "src/old-module.ts", "function movedApi(): string {\n  return 'old';\n}\n");
  write(root, "src/new-module.ts", "export function movedApi(): string {\n  return 'new';\n}\n");
  write(root, "prisma/schema.prisma", "model Sale {\n  id String @id\n}\n");
  if (withReviewManifest) {
    write(root, "scripts/release/breaking-change-review.json", `${JSON.stringify({
      schemaVersion: 1,
      baseSha,
      status: "reviewed-compatible",
      reviewedBy: "release-owner",
      reviewUrl: "https://github.com/lwhite702/DRX_Primary/pull/999#pullrequestreview-1",
      rationale: "The compatibility adapter remains supported and was reviewed against existing consumers.",
      signals: structuralSignalIds,
    }, null, 2)}\n`);
  }
  runGit(["add", "."]);
  runGit(["-c", "user.name=Release Integrity", "-c", "user.email=release-integrity@example.invalid", "commit", "--quiet", "-m", "structural contract changes"]);
  return {
    root,
    event: {
      pull_request: {
        base: { sha: baseSha },
        body: "Release impact: patch\nRoadmap impact: none",
      },
    },
  };
}

const structuralPr = structuralPrFixture(false);
const structuralErrors = validatePullRequest(structuralPr.root, structuralPr.event);
assert.match(structuralErrors.join("\n"), /Declared Release impact patch does not match required major/);
for (const signalId of structuralSignalIds) {
  assert.ok(
    structuralErrors.some((error) => error.includes(signalId)),
    `actual PR validation did not report structural signal ${signalId}\n${structuralErrors.join("\n")}`,
  );
}

const reviewedStructuralPr = structuralPrFixture(true);
assert.deepEqual(
  validatePullRequest(reviewedStructuralPr.root, reviewedStructuralPr.event),
  [],
  "a non-major declaration requires an exact repository-recorded compatibility review manifest",
);

const cutRoot = registerTempDir(mkdtempSync(join(tmpdir(), "drx-release-cut-")));
write(cutRoot, "VERSION", "0.6.0\n");
write(cutRoot, "CHANGELOG.md", validChangelog);
const cut = spawnSync(process.execPath, [join(import.meta.dirname, "cut.mjs"), "0.6.0"], {
  cwd: cutRoot,
  encoding: "utf8",
});
assert.equal(cut.status, 0, cut.stderr);
assert.match(readFileSync(join(cutRoot, "CHANGELOG.md"), "utf8"), /^## \[0\.6\.0\] - \d{4}-\d{2}-\d{2}$/m);
assert.ok(existsSync(join(cutRoot, "docs/help-center-export/changelog/drafts/0.6.0.md")));

cleanup();
console.log("Release integrity fixtures passed (version, changelog diff, SemVer, CI dependency policy, and six behavioral scenarios).");
