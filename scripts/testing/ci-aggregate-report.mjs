import fs from "node:fs";
import path from "node:path";

const requiredJobs = [
  "repo-audit",
  "preflight",
  "lint",
  "typecheck",
  "build",
  "required-auth-data",
  "required-ux",
  "unit",
  "integration",
  "security",
  "perf-smoke",
  "coverage-gate",
];

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

const statusFor = (job) => needs[job]?.result ?? "missing";
const failedRequired = requiredJobs.filter(
  (job) => statusFor(job) !== "success",
);
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
  "This report aggregates the isolated CI jobs declared in the workflow. Live",
  "production-account checks remain part of the operator-run `pnpm test:readiness`",
  "gate and are not re-executed on an uncredentialed GitHub runner.",
  "",
  "## Required jobs",
  "",
  "| Job | Result |",
  "|---|---|",
  ...requiredJobs.map((job) => `| ${job} | ${statusFor(job)} |`),
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
    ? "All required CI jobs completed successfully."
    : `Required jobs not successful: ${failedRequired.join(", ")}.`,
  "",
].join("\n");

const json = {
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
