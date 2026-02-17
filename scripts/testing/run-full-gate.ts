import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const docsDir = path.join(root, "docs/testing");
const reportPath = path.join(docsDir, "PRODUCTION_READINESS_REPORT.md");
const summaryPath = path.join(docsDir, "SUMMARY.md");
const rawPath = path.join(docsDir, "FULL_GATE_RESULTS.json");

const steps = [
  "pnpm test:matrix",
  "pnpm test:matrix:validate",
  "pnpm test:policy",
  "pnpm lint",
  "pnpm typecheck",
  "pnpm build",
  "pnpm test:unit",
  "pnpm test:integration",
  "pnpm test:e2e:web:smoke",
  "pnpm test:a11y",
  "pnpm test:security",
  "pnpm test:perf",
  "pnpm test:regression",
  "pnpm test:data-integrity",
];

function run(command: string) {
  const startedAt = Date.now();
  const proc = spawnSync(command, { cwd: root, shell: true, encoding: "utf8" });
  const durationSec = (Date.now() - startedAt) / 1000;
  return {
    command,
    code: proc.status ?? 1,
    durationSec: Number(durationSec.toFixed(2)),
    stdout: (proc.stdout ?? "").slice(0, 12000),
    stderr: (proc.stderr ?? "").slice(0, 12000),
  };
}

function readJsonIfExists(relPath: string): any | null {
  const p = path.join(root, relPath);
  if (!fs.existsSync(p)) return null;
  try {
    return JSON.parse(fs.readFileSync(p, "utf8"));
  } catch {
    return null;
  }
}

function artifactsList(): string[] {
  return [
    "docs/testing/REPO_AUDIT.json",
    "docs/testing/TEST_MATRIX.md",
    "docs/testing/TEST_MATRIX.json",
    "docs/testing/SECURITY_SCAN.json",
    "docs/testing/SECURITY_SCAN.junit.xml",
    "docs/testing/PERF_SMOKE.json",
    "docs/testing/DATA_INTEGRITY.json",
    "docs/testing/FULL_GATE_RESULTS.json",
  ].filter((f) => fs.existsSync(path.join(root, f)));
}

function main() {
  fs.mkdirSync(docsDir, { recursive: true });

  const previous = readJsonIfExists("docs/testing/FULL_GATE_RESULTS.json");
  const results = steps.map(run);
  const failed = results.filter((r) => r.code !== 0);

  const matrix = readJsonIfExists("docs/testing/TEST_MATRIX.json");
  const security = readJsonIfExists("docs/testing/SECURITY_SCAN.json");
  const perf = readJsonIfExists("docs/testing/PERF_SMOKE.json");
  const dataIntegrity = readJsonIfExists("docs/testing/DATA_INTEGRITY.json");

  const recommendation = failed.length === 0 ? "GO" : "NO-GO";
  const blocked = matrix?.summary?.coverage?.blocked ?? 0;
  const none = matrix?.summary?.coverage?.none ?? 0;
  const prevBlocked = previous?.matrix?.blocked ?? null;
  const prevNone = previous?.matrix?.none ?? null;

  const report = [
    "# PRODUCTION_READINESS_REPORT",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Recommendation: **${recommendation}**`,
    "",
    "## Command Results",
    "| Command | Exit | Duration (s) |",
    "|---|---:|---:|",
    ...results.map((r) => `| \`${r.command}\` | ${r.code} | ${r.durationSec} |`),
    "",
    "## Coverage / Risk",
    `- Matrix covered rows: ${matrix?.summary?.coverage?.covered ?? "N/A"}`,
    `- Matrix partial rows: ${matrix?.summary?.coverage?.partial ?? "N/A"}`,
    `- Matrix none rows: ${none}`,
    `- Matrix blocked rows: ${blocked}`,
    `- Matrix none delta: ${prevNone === null ? "N/A" : none - prevNone}`,
    `- Matrix blocked delta: ${prevBlocked === null ? "N/A" : blocked - prevBlocked}`,
    "",
    "## Security",
    `- High severity: ${security?.totals?.high ?? "N/A"}`,
    `- Medium severity: ${security?.totals?.medium ?? "N/A"}`,
    `- Dynamic failed: ${security?.totals?.dynamicFailed ?? "N/A"}`,
    "",
    "## Performance",
    `- App .next size (MB): ${perf?.metrics?.appNextMb ?? "N/A"}`,
    `- Marketing .next size (MB): ${perf?.metrics?.marketingNextMb ?? "N/A"}`,
    "",
    "## Data Integrity",
    `- Migration files: ${dataIntegrity?.migrationVerification?.migrationFiles?.length ?? "N/A"}`,
    `- Tenant guard signals: ${dataIntegrity?.tenantIsolation?.tenantGuardSignalsPresent ?? "N/A"}`,
    `- Rollback playbook present: ${dataIntegrity?.rollbackSafety?.playbookPresent ?? "N/A"}`,
    "",
    "## Failing Gates",
    ...(failed.length ? failed.map((f) => `- \`${f.command}\` failed (exit ${f.code})`) : ["- None"]),
    "",
    "## Artifacts",
    ...artifactsList().map((a) => `- ${a}`),
    "",
    "## GO/NO-GO Rationale",
    failed.length === 0
      ? "All required PR gates passed, and no blocking matrix/security signals remain."
      : "One or more required gates failed; release must not proceed until all blocking failures are remediated.",
  ].join("\n");

  const summary = [
    "# SUMMARY",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Release recommendation: **${recommendation}**`,
    "",
    "## Highlights",
    `- Total gates executed: ${results.length}`,
    `- Gates failed: ${failed.length}`,
    `- Matrix blocked rows: ${blocked}`,
    `- Matrix none rows: ${none}`,
    `- Security high findings: ${security?.totals?.high ?? "N/A"}`,
    "",
    "## Action Items",
    "1. Resolve all failed gates and rerun `pnpm test:readiness`.",
    "2. Keep runtime mock compatibility paths fully eliminated from production.",
    "3. Reduce matrix `none` coverage rows and keep `blocked` at zero.",
  ].join("\n");

  const raw = {
    schemaVersion: "2.0.0",
    generatedAt: new Date().toISOString(),
    recommendation,
    matrix: {
      blocked,
      none,
    },
    results,
  };

  fs.writeFileSync(reportPath, report);
  fs.writeFileSync(summaryPath, summary);
  fs.writeFileSync(rawPath, JSON.stringify(raw, null, 2));

  console.log(`Wrote ${path.relative(root, reportPath)}`);
  console.log(`Wrote ${path.relative(root, summaryPath)}`);

  if (failed.length > 0) process.exit(1);
}

main();
