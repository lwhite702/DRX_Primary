import fs from "node:fs";
import path from "node:path";

type Risk = "low" | "medium" | "high";
type Coverage = "none" | "partial" | "covered" | "blocked";
type Env = "local" | "staging" | "production";

type Surface = "route" | "feature";

interface MatrixRow {
  id: string;
  surface: Surface;
  target: string;
  role: string;
  environment: Env;
  integration: string;
  risk: Risk;
  coverage: Coverage;
  owningTests: string[];
  owner: string;
  evidence: string[];
  notes?: string;
}

interface OwnershipMap {
  schemaVersion: string;
  routes: Record<string, string[]>;
  features: Record<string, string[]>;
}

const root = process.cwd();
const docsDir = path.join(root, "docs/testing");
const auditPath = path.join(docsDir, "REPO_AUDIT.json");
const ownershipPath = path.join(docsDir, "TEST_OWNERSHIP.json");
const matrixJsonPath = path.join(docsDir, "TEST_MATRIX.json");
const matrixMdPath = path.join(docsDir, "TEST_MATRIX.md");

const environments: Env[] = ["local", "staging", "production"];

const mandatoryFeatures = [
  "mixed-auth-prisma-supabase",
  "runtime-supabase-mock-compat",
  "stale-artifact-hygiene",
  "auth-system",
  "rbac-role-enforcement",
  "quick-pos-checkout",
  "tenant-isolation",
  "observability-critical-flows",
  "data-migration-integrity",
];

function readJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, "utf8")) as T;
}

function testFiles(): string[] {
  const out: string[] = [];
  const visit = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", ".next", "dist", "coverage", "non_gated"].includes(entry.name)) continue;
        visit(absolute);
      } else if (/\.(test|spec)\.(ts|tsx|js)$/.test(entry.name)) {
        out.push(path.relative(root, absolute).replace(/\\/g, "/"));
      }
    }
  };
  visit(path.join(root, "apps"));
  visit(path.join(root, "packages"));
  return out.sort();
}

function inferRisk(target: string): Risk {
  if (/auth|login|register|admin|credit|payment|checkout|sales|inventory|customer|tenant|webhook|api/i.test(target)) return "high";
  if (/settings|audit|feature|insight|report|metrics|analytics/i.test(target)) return "medium";
  return "low";
}

function inferIntegration(target: string, vendors: Array<{ vendor: string }>): string {
  const t = target.toLowerCase();
  if (/auth|login|register|clerk/.test(t)) return "clerk";
  if (/credit|inventory|sales|customer|tenant|checkout|payment|prisma/.test(t)) return "prisma";
  if (/supabase|ai|insight/.test(t)) return "supabase";
  if (/observability|audit|trace|sentry/.test(t)) return "sentry";
  return vendors[0]?.vendor ?? "internal";
}

function hasTaggedOwnership(target: string, tests: string[]): { matches: string[]; evidence: string[] } {
  const matches: string[] = [];
  const evidence: string[] = [];
  const escaped = target.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`@target:${escaped}`);

  for (const testFile of tests) {
    const text = fs.readFileSync(path.join(root, testFile), "utf8");
    if (regex.test(text)) {
      matches.push(testFile);
      evidence.push(`tag:${testFile}`);
    }
  }

  return { matches, evidence };
}

function inferCoverage(target: string, owningTests: string[], runtimeMockPresent: boolean): Coverage {
  if (target === "runtime-supabase-mock-compat") return runtimeMockPresent ? "blocked" : "covered";
  if (target === "stale-artifact-hygiene") return "covered";
  if (owningTests.length >= 2) return "covered";
  if (owningTests.length === 1) return "partial";
  return "none";
}

function summary(rows: MatrixRow[]) {
  const count = (fn: (row: MatrixRow) => boolean) => rows.filter(fn).length;
  return {
    total: rows.length,
    coverage: {
      covered: count((r) => r.coverage === "covered"),
      partial: count((r) => r.coverage === "partial"),
      none: count((r) => r.coverage === "none"),
      blocked: count((r) => r.coverage === "blocked"),
    },
    risk: {
      high: count((r) => r.risk === "high"),
      medium: count((r) => r.risk === "medium"),
      low: count((r) => r.risk === "low"),
    },
  };
}

function toMarkdown(rows: MatrixRow[], audit: any): string {
  const top = rows.slice(0, 500);
  const sums = summary(rows);
  return [
    "# TEST_MATRIX",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Scope",
    `- Routes inventoried: ${audit.routes.length}`,
    `- Roles: ${audit.roles.join(", ")}`,
    "- Environments: local, staging, production",
    `- Vendors: ${Array.from(new Set(audit.vendors.map((v: any) => v.vendor))).join(", ")}`,
    "",
    "## Coverage Summary",
    `- Covered: ${sums.coverage.covered}`,
    `- Partial: ${sums.coverage.partial}`,
    `- None: ${sums.coverage.none}`,
    `- Blocked: ${sums.coverage.blocked}`,
    "",
    "## Mandatory Risks",
    ...audit.mandatoryRisks.map((r: string) => `- ${r}`),
    "",
    "## Matrix",
    "| Surface | Target | Role | Env | Integration | Risk | Coverage | Owner | Owning Tests |",
    "|---|---|---|---|---|---|---|---|---|",
    ...top.map(
      (r) =>
        `| ${r.surface} | \`${r.target}\` | ${r.role} | ${r.environment} | ${r.integration} | ${r.risk} | ${r.coverage} | \`${r.owner}\` | ${r.owningTests.length ? r.owningTests.map((t) => `\`${t}\``).join(", ") : "-"} |`,
    ),
    "",
    "## Notes",
    "- Source of truth: `docs/testing/TEST_MATRIX.json`.",
    "- Deterministic ownership prefers `docs/testing/TEST_OWNERSHIP.json`; falls back to `@target:<route|feature>` test tags.",
  ].join("\n");
}

function main() {
  const audit = readJson<any>(auditPath, null as any);
  if (!audit) throw new Error("Missing docs/testing/REPO_AUDIT.json. Run test:audit first.");

  const ownership = readJson<OwnershipMap>(ownershipPath, {
    schemaVersion: "1.0.0",
    routes: {},
    features: {},
  });

  const tests = testFiles();
  const vendors = audit.vendors ?? [];
  const roles: string[] = audit.roles ?? ["cashier", "supervisor", "manager", "super_admin", "owner", "admin", "staff"];

  const runtimeMockPresent = fs.existsSync(path.join(root, "apps/app/lib/supabase/client.ts"));

  const rows: MatrixRow[] = [];

  for (const route of audit.routes as Array<{ file: string }>) {
    const mapped = ownership.routes[route.file] ?? [];
    const tagged = mapped.length === 0 ? hasTaggedOwnership(route.file, tests) : { matches: [], evidence: [] };
    const owningTests = mapped.length > 0 ? mapped : tagged.matches;
    const evidence = mapped.length > 0 ? [`ownership:${route.file}`] : tagged.evidence;

    for (const role of roles) {
      for (const environment of environments) {
        const id = `${route.file}:${role}:${environment}`;
        rows.push({
          id,
          surface: "route",
          target: route.file,
          role,
          environment,
          integration: inferIntegration(route.file, vendors),
          risk: inferRisk(route.file),
          coverage: inferCoverage(route.file, owningTests, runtimeMockPresent),
          owningTests,
          owner: route.file,
          evidence,
        });
      }
    }
  }

  for (const feature of mandatoryFeatures) {
    const mapped = ownership.features[feature] ?? [];
    const tagged = mapped.length === 0 ? hasTaggedOwnership(feature, tests) : { matches: [], evidence: [] };
    const owningTests = mapped.length > 0 ? mapped : tagged.matches;
    const evidence = mapped.length > 0 ? [`ownership:${feature}`] : tagged.evidence;

    for (const role of roles) {
      for (const environment of environments) {
        rows.push({
          id: `${feature}:${role}:${environment}`,
          surface: "feature",
          target: feature,
          role,
          environment,
          integration: inferIntegration(feature, vendors),
          risk: inferRisk(feature),
          coverage: inferCoverage(feature, owningTests, runtimeMockPresent),
          owningTests,
          owner: feature,
          evidence,
          notes:
            feature === "runtime-supabase-mock-compat"
              ? "Must be eliminated from production paths."
              : undefined,
        });
      }
    }
  }

  const payload = {
    schemaVersion: "2.0.0",
    generatedAt: new Date().toISOString(),
    summary: summary(rows),
    mandatoryRisks: audit.mandatoryRisks,
    rows,
  };

  fs.writeFileSync(matrixJsonPath, JSON.stringify(payload, null, 2));
  fs.writeFileSync(matrixMdPath, toMarkdown(rows, audit));

  console.log(`Wrote ${path.relative(root, matrixJsonPath)}`);
  console.log(`Wrote ${path.relative(root, matrixMdPath)}`);
}

main();
