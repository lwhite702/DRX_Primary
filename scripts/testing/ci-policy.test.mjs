import assert from "node:assert/strict";
import { execFileSync, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { classifyChange, isDocumentationOnly } from "./ci-change-scope.mjs";

const event = { pull_request: { base: { sha: "a".repeat(40) }, head: { sha: "b".repeat(40) } } };
const report = fileURLToPath(new URL("./ci-aggregate-report.mjs", import.meta.url));

test("only known prose paths qualify; runtime/config/mixed/unknown and empty diffs do not", () => {
  assert.equal(isDocumentationOnly(["README.md", "docs/guide.md", "app-docs/checkout.md", ".agents/skills/example/SKILL.md"]), true);
  for (const files of [[], ["apps/app/page.tsx"], ["apps/app/content.md"], ["docs/page.mdx"], ["docs/config.json"], ["README.md", "package.json"], [".github/workflows/ci.yml"], ["VERSION"], ["unknown/file.md"]]) {
    assert.equal(isDocumentationOnly(files), false, JSON.stringify(files));
  }
});

test("push/manual events and unavailable/invalid diff data fail closed to full runtime checks", () => {
  const docs = () => "README.md\0";
  assert.equal(classifyChange("pull_request", event, docs), "docs");
  assert.equal(classifyChange("push", event, docs), "runtime");
  assert.equal(classifyChange("workflow_dispatch", event, docs), "runtime");
  assert.equal(classifyChange("pull_request", {}, docs), "runtime");
  assert.equal(classifyChange("pull_request", event, () => { throw Error("missing history"); }), "runtime");
  assert.equal(classifyChange("pull_request", event, () => ""), "runtime");
});

test("real git comparison detects a source file renamed into the docs allowlist", () => {
  const dir = mkdtempSync(path.join(tmpdir(), "ci-scope-"));
  const git = (args) => execFileSync("git", args, { cwd: dir, encoding: "utf8" });
  try {
    git(["init", "-q"]);
    git(["config", "user.name", "CI test"]);
    git(["config", "user.email", "ci@example.invalid"]);
    writeFileSync(path.join(dir, "code.js"), "export const value = 1;\n");
    git(["add", "."]); git(["commit", "-qm", "base"]);
    const base = git(["rev-parse", "HEAD"]).trim();
    git(["mv", "code.js", "README.md"]); git(["commit", "-qm", "rename"]);
    const head = git(["rev-parse", "HEAD"]).trim();
    assert.equal(classifyChange("pull_request", { pull_request: { base: { sha: base }, head: { sha: head } } }, git), "runtime");
  } finally { rmSync(dir, { recursive: true, force: true }); }
});

function runReport(scope, results, eventName = "pull_request", raw) {
  const dir = mkdtempSync(path.join(tmpdir(), "ci-report-"));
  try {
    const needs = Object.fromEntries(Object.entries(results).map(([job, result]) => [job, { result }]));
    const result = spawnSync(process.execPath, [report], {
      cwd: dir, encoding: "utf8",
      env: { ...process.env, CI_SCOPE: scope, CI_EVENT_NAME: eventName, CI_NEEDS_JSON: raw ?? JSON.stringify(needs) },
    });
    return result.status;
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

test("runtime aggregate rejects failures, missing jobs, cancellations, and skipped required checks", () => {
  const passing = { changes: "success", quality: "success", unit: "success", "required-ux": "success", "auth-e2e": "success" };
  assert.equal(runReport("runtime", passing), 0);
  for (const job of ["changes", "quality", "unit", "required-ux"]) {
    for (const result of ["failure", "skipped", "cancelled", "missing"]) {
      const values = { ...passing, [job]: result };
      if (result === "missing") delete values[job];
      assert.notEqual(runReport("runtime", values), 0, `${job}: ${result}`);
    }
  }
  assert.notEqual(runReport("", passing), 0);
  assert.notEqual(runReport("runtime", passing, "pull_request", "not json"), 0);
});

test("docs skips require a successful classifier/release gate on a PR and exact skipped runtime jobs", () => {
  const docs = { changes: "success", quality: "skipped", unit: "skipped", "required-ux": "skipped", "auth-e2e": "skipped" };
  assert.equal(runReport("docs", docs), 0);
  assert.notEqual(runReport("docs", docs, "push"), 0);
  assert.notEqual(runReport("docs", { ...docs, changes: "failure" }), 0);
  assert.notEqual(runReport("docs", { ...docs, quality: "failure" }), 0);
  assert.notEqual(runReport("docs", { ...docs, unit: "cancelled" }), 0);
  delete docs.unit;
  assert.notEqual(runReport("docs", docs), 0);
});

test("existing advisory auth status cannot override required job failures", () => {
  const passing = { changes: "success", quality: "success", unit: "success", "required-ux": "success", "auth-e2e": "skipped" };
  assert.equal(runReport("runtime", passing), 0);
  assert.notEqual(runReport("runtime", { ...passing, quality: "failure" }), 0);
});
