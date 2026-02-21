import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

type GateDefinition = {
  id: number;
  name: string;
  requiredForBeta: boolean;
  objective: string;
  commands: string[];
};

type CommandResult = {
  command: string;
  code: number;
  durationSec: number;
  stdout: string;
  stderr: string;
};

const root = process.cwd();
const docsDir = path.join(root, "docs/testing");
const reportPath = path.join(docsDir, "PRODUCTION_READINESS_REPORT.md");
const summaryPath = path.join(docsDir, "SUMMARY.md");
const jsonPath = path.join(docsDir, "FULL_GATE_RESULTS.json");

const gates: GateDefinition[] = [
  {
    id: 0,
    name: "Build Stability",
    requiredForBeta: true,
    objective: "Deterministic install, lint/typecheck/build integrity.",
    commands: [
      "pnpm install --frozen-lockfile",
      "pnpm lint",
      "pnpm typecheck",
      "pnpm build",
    ],
  },
  {
    id: 1,
    name: "Auth Stability",
    requiredForBeta: true,
    objective: "Auth redirects, onboarding flow, and session handling.",
    commands: [
      "pnpm --filter deelrxcrm-app vitest run tests/middleware.test.ts tests/auth",
    ],
  },
  {
    id: 2,
    name: "Environment Discipline",
    requiredForBeta: true,
    objective: "Policy and repository discipline checks.",
    commands: ["pnpm test:matrix", "pnpm test:policy"],
  },
  {
    id: 3,
    name: "Data Integrity",
    requiredForBeta: true,
    objective: "POS checkout contract and transactional safety checks.",
    commands: [
      "pnpm --filter deelrxcrm-app vitest run tests/pos tests/quick-pos",
    ],
  },
  {
    id: 4,
    name: "Permissions + Audit",
    requiredForBeta: false,
    objective: "Role-based behavior and audit log expectations.",
    commands: [
      "pnpm --filter deelrxcrm-app vitest run tests/integration/audit.test.ts",
    ],
  },
  {
    id: 5,
    name: "Observability",
    requiredForBeta: false,
    objective: "Security and performance smoke signals.",
    commands: ["pnpm test:security", "pnpm test:perf"],
  },
  {
    id: 6,
    name: "UX Readiness",
    requiredForBeta: false,
    objective: "End-to-end UX stability and accessibility sanity checks.",
    commands: ["pnpm test:e2e:web", "pnpm test:a11y"],
  },
];

function run(command: string): CommandResult {
  const startedAt = Date.now();
  const proc = spawnSync(command, {
    cwd: root,
    shell: true,
    encoding: "utf8",
  });
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

function buildOrderedCommandList(): string[] {
  const ordered: string[] = [];
  for (const gate of gates) {
    for (const command of gate.commands) {
      if (!ordered.includes(command)) {
        ordered.push(command);
      }
    }
  }
  return ordered;
}

function main() {
  fs.mkdirSync(docsDir, { recursive: true });

  const orderedCommands = buildOrderedCommandList();
  const results = orderedCommands.map(run);
  const resultByCommand = new Map(results.map((result) => [result.command, result]));

  const gateResults = gates.map((gate) => {
    const commandResults = gate.commands
      .map((command) => resultByCommand.get(command))
      .filter((result): result is CommandResult => Boolean(result));
    const passedChecks = commandResults.filter((result) => result.code === 0).length;
    const passRate = commandResults.length === 0
      ? 0
      : Number(((passedChecks / commandResults.length) * 100).toFixed(2));
    const pass = passRate === 100;
    return {
      ...gate,
      pass,
      passRate,
      commandResults,
    };
  });

  const requiredGateResults = gateResults.filter((gate) => gate.requiredForBeta);
  const optionalGateResults = gateResults.filter((gate) => !gate.requiredForBeta);
  const failedRequired = requiredGateResults.filter((gate) => !gate.pass);
  const failedOptional = optionalGateResults.filter((gate) => !gate.pass);
  const failedCommands = results.filter((result) => result.code !== 0);

  const recommendation = failedRequired.length === 0 ? "GO" : "NO-GO";

  const matrix = readJsonIfExists("docs/testing/TEST_MATRIX.json");
  const security = readJsonIfExists("docs/testing/SECURITY_SCAN.json");
  const perf = readJsonIfExists("docs/testing/PERF_SMOKE.json");

  const report = [
    "# PRODUCTION_READINESS_REPORT",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Recommendation: **${recommendation}**`,
    "",
    "## Release Rule",
    "- Beta can ship only if Gates 0-3 are at 100% pass rate.",
    `- Required gate pass status: **${failedRequired.length === 0 ? "PASS" : "FAIL"}**`,
    "",
    "## Gate Summary",
    "| Gate | Name | Required | Pass Rate | Status |",
    "|---:|---|---|---:|---|",
    ...gateResults.map(
      (gate) =>
        `| ${gate.id} | ${gate.name} | ${gate.requiredForBeta ? "Yes" : "No"} | ${gate.passRate.toFixed(2)}% | ${gate.pass ? "PASS" : "FAIL"} |`,
    ),
    "",
    "## Command Results",
    "| Command | Exit | Duration (s) |",
    "|---|---:|---:|",
    ...results.map((result) => `| \`${result.command}\` | ${result.code} | ${result.durationSec} |`),
    "",
    "## Failing Gates",
    ...(failedRequired.length
      ? failedRequired.map((gate) => `- Required Gate ${gate.id} (${gate.name}) failed`)
      : ["- None"]),
    ...(failedOptional.length
      ? failedOptional.map((gate) => `- Optional Gate ${gate.id} (${gate.name}) failed`)
      : []),
    "",
    "## Coverage Percentages",
    `- Matrix covered rows: ${matrix?.summary?.coverage?.covered ?? "N/A"}`,
    `- Matrix partial rows: ${matrix?.summary?.coverage?.partial ?? "N/A"}`,
    `- Matrix none rows: ${matrix?.summary?.coverage?.none ?? "N/A"}`,
    `- Matrix blocked rows: ${matrix?.summary?.coverage?.blocked ?? "N/A"}`,
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
    "- docs/testing/FULL_GATE_RESULTS.json",
    "",
    "## Recommendation Rationale",
    failedRequired.length === 0
      ? "All required gates (0-3) passed at 100%."
      : "At least one required gate (0-3) failed; release should not proceed until remediated.",
  ].join("\n");

  const summary = [
    "# SUMMARY",
    "",
    `Generated: ${new Date().toISOString()}`,
    `Release recommendation: **${recommendation}**`,
    "",
    "## Gate Outcome",
    `- Required gates passed: ${requiredGateResults.length - failedRequired.length}/${requiredGateResults.length}`,
    `- Optional gates passed: ${optionalGateResults.length - failedOptional.length}/${optionalGateResults.length}`,
    `- Total failed commands: ${failedCommands.length}`,
    "",
    "## Required Gates (0-3)",
    ...requiredGateResults.map(
      (gate) => `- Gate ${gate.id} ${gate.name}: ${gate.pass ? "PASS" : "FAIL"} (${gate.passRate.toFixed(2)}%)`,
    ),
    "",
    "## Next Actions",
    "1. Resolve all failing required gates and rerun `pnpm test:readiness`.",
    "2. Keep lockfile and dependency overrides deterministic (`pnpm install --frozen-lockfile`).",
    "3. Keep deferred migration scope (legacy Supabase/POS-engine call sites) out of PR #41.",
  ].join("\n");

  const raw = {
    generatedAt: new Date().toISOString(),
    recommendation,
    rule: "GO only if Gates 0-3 pass at 100%",
    gates: gateResults.map((gate) => ({
      id: gate.id,
      name: gate.name,
      requiredForBeta: gate.requiredForBeta,
      pass: gate.pass,
      passRate: gate.passRate,
      checks: gate.commandResults.map((result) => ({
        command: result.command,
        code: result.code,
        durationSec: result.durationSec,
      })),
    })),
    commands: results.map((result) => ({
      command: result.command,
      code: result.code,
      durationSec: result.durationSec,
    })),
  };

  fs.writeFileSync(reportPath, report);
  fs.writeFileSync(summaryPath, summary);
  fs.writeFileSync(jsonPath, JSON.stringify(raw, null, 2));

  console.log(`Wrote ${path.relative(root, reportPath)}`);
  console.log(`Wrote ${path.relative(root, summaryPath)}`);
  console.log(`Wrote ${path.relative(root, jsonPath)}`);

  if (failedRequired.length > 0) {
    process.exit(1);
  }
}

main();
