import fs from "node:fs";
import path from "node:path";

// Only a successful classifier on a PR can allow intentional runtime skips.
// Push/manual runs always require the complete integrated-tree gates.
const scope = process.env.CI_SCOPE;
const docsOnly = scope === "docs" && process.env.CI_EVENT_NAME === "pull_request";
const runtimeJobs = ["quality", "unit", "required-ux"];
const requiredJobs = ["changes", ...runtimeJobs];
const supportingJobs = ["e2e-web", "a11y", "auth-e2e"];
const rawNeeds = process.env.CI_NEEDS_JSON;

if (!rawNeeds) {
  console.error("CI aggregate failed: CI_NEEDS_JSON is not set.");
  process.exit(1);
}

let needs;
try {
  needs = JSON.parse(rawNeeds);
} catch (error) {
  console.error(
    `CI aggregate failed: CI_NEEDS_JSON is invalid JSON. ${error.message}`,
  );
  process.exit(1);
}

const statusFor = (job) => {
  if (["e2e-web", "a11y"].includes(job)) return needs["required-ux"]?.outputs?.[job] || "skipped";
  return needs[job]?.result ?? "missing";
};
const expectedFor = (job) => docsOnly && runtimeJobs.includes(job) ? "skipped" : "success";
const failedRequired = requiredJobs.filter((job) => statusFor(job) !== expectedFor(job));
if (!["runtime", "docs"].includes(scope) || (scope === "docs" && !docsOnly)) {
  failedRequired.push("invalid-scope");
}
const generatedAt = new Date().toISOString();
const recommendation = failedRequired.length === 0 ? "GO" : "NO-GO";
const reportDir = path.join(process.cwd(), "docs/testing");

fs.mkdirSync(reportDir, { recursive: true });

const markdown = [
  "# CI_AGGREGATE_REPORT",
  "",
  `Generated: ${generatedAt}`,
  `Recommendation: **${recommendation}**`,
  "",
  `Scope: **${scope ?? "missing"}**. Documentation-only PRs intentionally skip runtime jobs.`,
  "Release integrity is checked by the changes job even for documentation-only PRs.",
  "This report aggregates the consolidated CI jobs declared in the workflow. Live",
  "production-account checks remain part of the operator-run `pnpm test:readiness`",
  "gate and are not re-executed on an uncredentialed GitHub runner.",
  "",
  "## Required jobs",
  "",
  "| Job | Result | Expected |",
  "|---|---|---|",
  ...requiredJobs.map((job) => `| ${job} | ${statusFor(job)} | ${expectedFor(job)} |`),
  "",
  "## Supporting jobs",
  "",
  "| Job | Result |",
  "|---|---|",
  ...supportingJobs.map((job) => `| ${job} | ${statusFor(job)} |`),
  "",
  "## Outcome",
  "",
  failedRequired.length === 0
    ? "All required CI jobs matched the verified change scope."
    : `Required jobs not successful: ${failedRequired.join(", ")}.`,
  "",
].join("\n");

const json = {
  scope,
  docsOnly,
  generatedAt,
  recommendation,
  requiredJobs: Object.fromEntries(
    requiredJobs.map((job) => [job, statusFor(job)]),
  ),
  supportingJobs: Object.fromEntries(
    supportingJobs.map((job) => [job, statusFor(job)]),
  ),
  failedRequired,
};

fs.writeFileSync(path.join(reportDir, "CI_AGGREGATE_REPORT.md"), markdown);
fs.writeFileSync(
  path.join(reportDir, "CI_AGGREGATE_REPORT.json"),
  `${JSON.stringify(json, null, 2)}\n`,
);

console.log(`CI aggregate recommendation: ${recommendation}`);
if (failedRequired.length > 0) process.exit(1);
