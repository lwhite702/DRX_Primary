import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

const root = process.cwd();
const docsDir = path.join(root, "docs/testing");
const reportPath = path.join(docsDir, "PRODUCTION_READINESS_REPORT.md");
const summaryPath = path.join(docsDir, "SUMMARY.md");

const steps = [
  "pnpm test:matrix",
  "pnpm test:policy",
  "pnpm lint",
  "pnpm typecheck",
  "pnpm build",
  "pnpm test:unit",
  "pnpm test:integration",
  "pnpm test:e2e:web",
  "pnpm test:a11y",
  "pnpm test:security",
  "pnpm test:perf",
  "pnpm test:regression",
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

function main() {
  fs.mkdirSync(docsDir, { recursive: true });

  const results = steps.map(run);
  const failed = results.filter((r) => r.code !== 0);

  const matrix = readJsonIfExists("docs/testing/TEST_MATRIX.json");
  const security = readJsonIfExists("docs/testing/SECURITY_SCAN.json");
  const perf = readJsonIfExists("docs/testing/PERF_SMOKE.json");

  const recommendation = failed.length === 0 ? "GO" : "NO-GO";

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
    "## Coverage Percentages",
    `- Matrix covered rows: ${matrix?.summary?.coverage?.covered ?? "N/A"}`,
    `- Matrix partial rows: ${matrix?.summary?.coverage?.partial ?? "N/A"}`,
    `- Matrix none rows: ${matrix?.summary?.coverage?.none ?? "N/A"}`,
    `- Matrix blocked rows: ${matrix?.summary?.coverage?.blocked ?? "N/A"}`,
    "",
    "## Failing Tests / Gates",
    ...(failed.length
      ? failed.map((f) => `- \`${f.command}\` failed (exit ${f.code})`)
      : ["- None"]),
    "",
    "## Risk Areas",
    "- Runtime mock compatibility surfaces",
    "- Mixed Clerk/Prisma/Supabase integration paths",
    "- Any matrix rows with `blocked` or `none` coverage",
    "",
    "## Uncovered Modules",
    `- Rows with no coverage: ${matrix?.summary?.coverage?.none ?? "N/A"}`,
    "",
    "## Performance Metrics",
    `- App .next size (MB): ${perf?.metrics?.appNextMb ?? "N/A"}`,
    `- Marketing .next size (MB): ${perf?.metrics?.marketingNextMb ?? "N/A"}`,
    "",
    "## Security Risk Findings",
    `- High severity: ${security?.totals?.high ?? "N/A"}`,
    `- Medium severity: ${security?.totals?.medium ?? "N/A"}`,
    "",
    "## Artifacts",
    "- docs/testing/TEST_MATRIX.md",
    "- docs/testing/TEST_MATRIX.json",
    "- docs/testing/SECURITY_SCAN.json",
    "- docs/testing/PERF_SMOKE.json",
    "",
    "## Recommendation Rationale",
    failed.length === 0
      ? "All configured gates passed in this run."
      : "One or more required gates failed; release should not proceed until failures are remediated.",
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
    `- Matrix blocked rows: ${matrix?.summary?.coverage?.blocked ?? "N/A"}`,
    `- Security high findings: ${security?.totals?.high ?? "N/A"}`,
    "",
    "## Next Actions",
    "1. Resolve all failed gates and rerun `pnpm test:readiness`.",
    "2. Eliminate runtime mock compatibility paths from production code.",
    "3. Reduce `none`/`blocked` matrix rows before beta launch.",
  ].join("\n");

  fs.writeFileSync(reportPath, report);
  fs.writeFileSync(summaryPath, summary);

  const raw = {
    generatedAt: new Date().toISOString(),
    recommendation,
    results,
  };
  fs.writeFileSync(path.join(docsDir, "FULL_GATE_RESULTS.json"), JSON.stringify(raw, null, 2));

  console.log(`Wrote ${path.relative(root, reportPath)}`);
  console.log(`Wrote ${path.relative(root, summaryPath)}`);

  if (failed.length > 0) process.exit(1);
}

main();
