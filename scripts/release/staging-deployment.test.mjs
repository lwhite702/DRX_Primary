import assert from "node:assert/strict";
import test from "node:test";
import { validateConfiguration, validateHealth, validateSource } from "./staging-deployment.mjs";

const sha = "a".repeat(40);
const repository = "example/drx";
const run = { name: "CI Gate", conclusion: "success", event: "push", head_branch: "staging",
  head_repository: { full_name: repository }, head_sha: sha };

test("only the successful current staging push from this repository can deploy", () => {
  assert.doesNotThrow(() => validateSource({ workflow_run: run }, repository, sha, sha));
  for (const change of [{ name: "Other" }, { conclusion: "failure" }, { conclusion: "cancelled" },
    { event: "pull_request" }, { event: "workflow_dispatch" }, { head_branch: "development" },
    { head_branch: "main" }, { head_repository: { full_name: "fork/drx" } }, { head_sha: "invalid" }]) {
    assert.throws(() => validateSource({ workflow_run: { ...run, ...change } }, repository, sha, sha));
  }
  assert.throws(() => validateSource({}, repository, sha, sha));
  assert.throws(() => validateSource({ workflow_run: run }, repository, "b".repeat(40), sha));
  assert.throws(() => validateSource({ workflow_run: run }, repository, sha, "b".repeat(40)));
});

test("missing staging configuration fails even when production credentials exist", () => {
  const env = Object.fromEntries(["CONVEX_DEPLOY_KEY", "VERCEL_TOKEN", "VERCEL_ORG_ID",
    "VERCEL_PROJECT_ID", "VERCEL_SCOPE"].map(key => [`${key}_STAGING`, "synthetic"]));
  assert.doesNotThrow(() => validateConfiguration(env));
  for (const key of Object.keys(env)) {
    assert.throws(() => validateConfiguration({ ...env, [key]: "", [key.replace(/_STAGING$/, "")]: "production-fixture" }), /Missing dedicated staging/);
  }
});

test("health rejects login HTML, malformed data and unhealthy database responses", () => {
  assert.doesNotThrow(() => validateHealth(JSON.stringify({ status: "healthy", checks: { database: true } })));
  for (const raw of ["<html>Sign in</html>", "null", "{}", JSON.stringify({ status: "healthy" }),
    JSON.stringify({ status: "healthy", checks: { database: false } }),
    JSON.stringify({ status: "degraded", checks: { database: true } })]) {
    assert.throws(() => validateHealth(raw));
  }
});
