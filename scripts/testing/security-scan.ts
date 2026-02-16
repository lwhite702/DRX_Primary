import fs from "node:fs";
import path from "node:path";

const root = process.cwd();

const targets = ["apps/app", "apps/marketing", "packages"];
const findings: Array<{ file: string; severity: "high" | "medium"; rule: string; detail: string }> = [];

const checks: Array<{ rule: string; severity: "high" | "medium"; regex: RegExp; detail: string }> = [
  { rule: "SEC-EVAL", severity: "high", regex: /\beval\s*\(/, detail: "Dynamic eval detected" },
  { rule: "SEC-FUNCTION", severity: "high", regex: /new\s+Function\s*\(/, detail: "Dynamic Function constructor detected" },
  { rule: "SEC-INNERHTML", severity: "high", regex: /dangerouslySetInnerHTML|\.innerHTML\s*=/, detail: "Unsafe HTML sink detected" },
  { rule: "SEC-OPEN-REDIRECT", severity: "medium", regex: /NextResponse\.redirect\([^\n]*searchParams|get\(['\"](next|redirect|returnTo|url)['\"]\)/i, detail: "Potential redirect with untrusted source" },
  { rule: "SEC-WILDCARD-CORS", severity: "high", regex: /Access-Control-Allow-Origin["']?\s*[:,]\s*["']\*/i, detail: "Wildcard CORS origin detected" },
  { rule: "SEC-WILDCARD-POSTMSG", severity: "medium", regex: /postMessage\([^\)]*,\s*["']\*["']\)/, detail: "postMessage wildcard target origin" },
  { rule: "SEC-MOCK-SUPABASE", severity: "high", regex: /mockSupabase|getSupabaseClient\(/, detail: "Runtime mock compatibility surface" },
  { rule: "SEC-INSECURE-COOKIE", severity: "medium", regex: /cookies\(\)\.set\([^\)]*secure:\s*false/i, detail: "Cookie secure flag disabled" },
];

function walk(dir: string, files: string[] = []): string[] {
  if (!fs.existsSync(dir)) return files;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const absolute = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (["node_modules", ".next", "dist", "tests", "testsprite_tests"].includes(entry.name)) continue;
      walk(absolute, files);
    } else if (/\.(ts|tsx|js|jsx)$/.test(entry.name)) {
      files.push(path.relative(root, absolute).replace(/\\/g, "/"));
    }
  }
  return files;
}

for (const target of targets) {
  for (const file of walk(path.join(root, target))) {
    const text = fs.readFileSync(path.join(root, file), "utf8");
    for (const check of checks) {
      if (check.regex.test(text)) {
        findings.push({ file, severity: check.severity, rule: check.rule, detail: check.detail });
      }
    }
  }
}

const high = findings.filter((f) => f.severity === "high");
const medium = findings.filter((f) => f.severity === "medium");

const out = {
  generatedAt: new Date().toISOString(),
  totals: { high: high.length, medium: medium.length },
  findings,
};

fs.mkdirSync(path.join(root, "docs/testing"), { recursive: true });
fs.writeFileSync(path.join(root, "docs/testing/SECURITY_SCAN.json"), JSON.stringify(out, null, 2));

if (high.length > 0) {
  console.error(`Security scan failed: ${high.length} high-severity finding(s)`);
  for (const finding of high.slice(0, 50)) {
    console.error(`- [${finding.rule}] ${finding.file}: ${finding.detail}`);
  }
  process.exit(1);
}

console.log(`Security scan passed with ${medium.length} medium findings recorded.`);
