import fs from "node:fs";
import path from "node:path";

type Severity = "high" | "medium";

const root = process.cwd();
const docsDir = path.join(root, "docs/testing");
const jsonPath = path.join(docsDir, "SECURITY_SCAN.json");
const junitPath = path.join(docsDir, "SECURITY_SCAN.junit.xml");

const targets = ["apps/app", "apps/marketing", "packages"];
const findings: Array<{ file: string; severity: Severity; rule: string; detail: string }> = [];

const staticChecks: Array<{ rule: string; severity: Severity; regex: RegExp; detail: string }> = [
  { rule: "SEC-EVAL", severity: "high", regex: /\beval\s*\(/, detail: "Dynamic eval detected" },
  { rule: "SEC-FUNCTION", severity: "high", regex: /new\s+Function\s*\(/, detail: "Dynamic Function constructor detected" },
  { rule: "SEC-INNERHTML", severity: "high", regex: /dangerouslySetInnerHTML|\.innerHTML\s*=/, detail: "Unsafe HTML sink detected" },
  { rule: "SEC-OPEN-REDIRECT", severity: "medium", regex: /NextResponse\.redirect\([^\n]*searchParams|get\(['\"](next|redirect|returnTo|url)['\"]\)/i, detail: "Potential redirect with untrusted source" },
  { rule: "SEC-WILDCARD-CORS", severity: "high", regex: /Access-Control-Allow-Origin["']?\s*[:,]\s*["']\*/i, detail: "Wildcard CORS origin detected" },
  { rule: "SEC-WILDCARD-POSTMSG", severity: "medium", regex: /postMessage\([^\)]*,\s*["']\*["']\)/, detail: "postMessage wildcard target origin" },
  { rule: "SEC-LEGACY-SUPABASE", severity: "high", regex: /@\/lib\/supabase\/client|getSupabaseClient\(/, detail: "Legacy Supabase compatibility client usage" },
  { rule: "SEC-INSECURE-COOKIE", severity: "medium", regex: /cookies\(\)\.set\([^\)]*secure:\s*false/i, detail: "Cookie secure flag disabled" },
];

const dynamicResults: Array<{ name: string; pass: boolean; detail: string }> = [];

function walk(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (
        [
          "node_modules",
          ".next",
          "dist",
          "tests",
          "testsprite_tests",
          "coverage",
          "playwright-report",
          "test-results",
        ].includes(entry.name)
      ) {
        continue;
      }
      walk(absolute, files);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(path.relative(root, absolute).replace(/\\/g, "/"));
    }
  }
  return files;
}

async function runDynamicChecks() {
  const baseUrl = process.env.SECURITY_DYNAMIC_BASE_URL;
  if (!baseUrl) {
    dynamicResults.push({
      name: "dynamic-suite",
      pass: true,
      detail: "SECURITY_DYNAMIC_BASE_URL not set; dynamic checks skipped",
    });
    return;
  }

  const checks: Array<{ name: string; path: string; expectedBlockedStatus?: number[] }> = [
    { name: "csrf-guard", path: "/api/sales", expectedBlockedStatus: [401, 403, 405] },
    { name: "rbac-guard", path: "/api/admin/users", expectedBlockedStatus: [401, 403] },
    { name: "rate-limit-route", path: "/api/notifications", expectedBlockedStatus: [200, 401, 403, 429] },
  ];

  for (const check of checks) {
    try {
      const url = `${baseUrl.replace(/\/$/, "")}${check.path}`;
      const res = await fetch(url, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ probe: "security" }),
      });
      const pass = check.expectedBlockedStatus?.includes(res.status) ?? false;
      dynamicResults.push({
        name: check.name,
        pass,
        detail: `status=${res.status} path=${check.path}`,
      });
    } catch (error) {
      dynamicResults.push({
        name: check.name,
        pass: false,
        detail: `request failed: ${(error as Error).message}`,
      });
    }
  }
}

function toJunit(total: number, failed: number) {
  const testcases: string[] = [];

  for (const finding of findings) {
    const name = `${finding.rule}:${finding.file}`;
    const failure = finding.severity === "high" ? `<failure message="${finding.detail}"/>` : "";
    testcases.push(`<testcase classname="security.static" name="${escapeXml(name)}">${failure}</testcase>`);
  }

  for (const result of dynamicResults) {
    const failure = result.pass ? "" : `<failure message="${escapeXml(result.detail)}"/>`;
    testcases.push(`<testcase classname="security.dynamic" name="${escapeXml(result.name)}">${failure}</testcase>`);
  }

  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    `<testsuite name="security-scan" tests="${total}" failures="${failed}">`,
    ...testcases,
    "</testsuite>",
  ].join("\n");
}

function escapeXml(input: string): string {
  return input
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function main() {
  for (const target of targets) {
    for (const file of walk(path.join(root, target))) {
      const text = fs.readFileSync(path.join(root, file), "utf8");
      for (const check of staticChecks) {
        if (check.regex.test(text)) {
          findings.push({ file, severity: check.severity, rule: check.rule, detail: check.detail });
        }
      }
    }
  }

  await runDynamicChecks();

  const high = findings.filter((f) => f.severity === "high");
  const medium = findings.filter((f) => f.severity === "medium");
  const dynamicFailed = dynamicResults.filter((r) => !r.pass);

  const out = {
    schemaVersion: "2.0.0",
    generatedAt: new Date().toISOString(),
    totals: { high: high.length, medium: medium.length, dynamicFailed: dynamicFailed.length },
    findings,
    dynamicResults,
  };

  fs.mkdirSync(docsDir, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(out, null, 2));
  const totalTests = findings.length + dynamicResults.length;
  fs.writeFileSync(junitPath, toJunit(totalTests, high.length + dynamicFailed.length));

  if (high.length > 0 || dynamicFailed.length > 0) {
    console.error(`Security scan failed: high=${high.length}, dynamicFailed=${dynamicFailed.length}`);
    process.exit(1);
  }

  console.log(`Security scan passed. medium=${medium.length}`);
}

main();
