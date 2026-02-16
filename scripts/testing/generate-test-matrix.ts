import fs from "node:fs";
import path from "node:path";

type Risk = "low" | "medium" | "high";
type Coverage = "none" | "partial" | "covered" | "blocked";

interface MatrixRow {
  id: string;
  surface: "route" | "feature";
  target: string;
  role: string;
  environment: "local" | "staging" | "production";
  integration: string;
  risk: Risk;
  coverage: Coverage;
  owningTests: string[];
  notes?: string;
}

const root = process.cwd();
const docsDir = path.join(root, "docs/testing");
const auditPath = path.join(docsDir, "REPO_AUDIT.json");
const matrixJsonPath = path.join(docsDir, "TEST_MATRIX.json");
const matrixMdPath = path.join(docsDir, "TEST_MATRIX.md");

function testFiles(): string[] {
  const out: string[] = [];
  const visit = (dir: string) => {
    if (!fs.existsSync(dir)) return;
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const absolute = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (["node_modules", ".next", "dist"].includes(entry.name)) continue;
        visit(absolute);
      } else {
        const rel = path.relative(root, absolute).replace(/\\/g, "/");
        if (/\.(test|spec)\.(ts|tsx|js)$/.test(rel)) out.push(rel);
      }
    }
  };
  visit(path.join(root, "apps"));
  visit(path.join(root, "packages"));
  return out.sort();
}

function inferRisk(target: string): Risk {
  if (/\/api\/(admin|credit|sales|inventory|team|webhooks|v1)|login|register|pos|payment|auth|customer|tenant/i.test(target)) return "high";
  if (/settings|reports|insights|feature|audit|help|waitlist/i.test(target)) return "medium";
  return "low";
}

function inferIntegration(target: string, integrations: string[]): string {
  const t = target.toLowerCase();
  if (/clerk|login|register|auth|team/.test(t)) return "clerk";
  if (/credit|inventory|sales|customer|api/.test(t)) return integrations.includes("prisma") ? "prisma" : "supabase";
  if (/ai|insight/.test(t)) return "supabase edge";
  if (/feedback|error/.test(t)) return "sentry";
  return integrations[0] ?? "internal";
}

function findOwningTests(target: string, tests: string[]): string[] {
  const tokens = target
    .toLowerCase()
    .replace(/[^a-z0-9/]/g, "")
    .split(/[\/_-]+/)
    .filter((t) => t.length > 2)
    .slice(0, 5);

  const matches = tests.filter((t) => tokens.some((token) => t.toLowerCase().includes(token)));
  return matches.slice(0, 6);
}

function inferCoverage(target: string, matches: string[]): Coverage {
  if (/lib\/supabase\/client\.ts/.test(target)) return "blocked";
  if (matches.length >= 2) return "covered";
  if (matches.length === 1) return "partial";
  return "none";
}

function buildRows(audit: any): MatrixRow[] {
  const routes = [
    ...(audit.routes?.app ?? []),
    ...(audit.routes?.marketing ?? []),
    ...(audit.routes?.mobile ?? []),
  ] as string[];
  const roles = Array.from(new Set([...(audit.roles ?? []), "owner", "admin", "staff"])) as string[];
  const environments: Array<"local" | "staging" | "production"> = ["local", "staging", "production"];
  const tests = testFiles();

  const rows: MatrixRow[] = [];

  for (const route of routes) {
    const owning = findOwningTests(route, tests);
    const risk = inferRisk(route);
    const integration = inferIntegration(route, audit.integrations ?? []);

    for (const role of roles) {
      for (const environment of environments) {
        const id = `${route}:${role}:${environment}`;
        rows.push({
          id,
          surface: "route",
          target: route,
          role,
          environment,
          integration,
          risk,
          coverage: inferCoverage(route, owning),
          owningTests: owning,
        });
      }
    }
  }

  const features = [
    "auth-system",
    "rbac-role-enforcement",
    "credit-engine",
    "inventory-intake",
    "quick-pos-checkout",
    "feature-flags",
    "audit-logging",
    "observability-sentry-posthog",
    "data-migrations",
    "tenant-isolation",
    "runtime-supabase-mock-compat",
  ];

  for (const feature of features) {
    const owning = findOwningTests(feature, tests);
    const risk = inferRisk(feature);
    const integration = inferIntegration(feature, audit.integrations ?? []);

    for (const role of roles) {
      for (const environment of environments) {
        rows.push({
          id: `${feature}:${role}:${environment}`,
          surface: "feature",
          target: feature,
          role,
          environment,
          integration,
          risk,
          coverage: inferCoverage(feature, owning),
          owningTests: owning,
          notes: feature === "runtime-supabase-mock-compat" ? "Must be eliminated from production paths" : undefined,
        });
      }
    }
  }

  return rows;
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
  const top = rows.slice(0, 300);
  const sums = summary(rows);
  return [
    "# TEST_MATRIX",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    "## Scope",
    `- App routes: ${(audit.routes?.app ?? []).length}`,
    `- Marketing routes: ${(audit.routes?.marketing ?? []).length}`,
    `- Mobile screens: ${(audit.routes?.mobile ?? []).length}`,
    `- Roles: ${Array.from(new Set([...(audit.roles ?? []), "owner", "admin", "staff"])).join(", ")}`,
    "- Environments: local, staging, production",
    `- Integrations: ${(audit.integrations ?? []).join(", ")}`,
    "",
    "## Coverage Summary",
    `- Covered: ${sums.coverage.covered}`,
    `- Partial: ${sums.coverage.partial}`,
    `- None: ${sums.coverage.none}`,
    `- Blocked: ${sums.coverage.blocked}`,
    "",
    "## Mandatory Risks",
    ...(audit.mandatoryRisks ?? []).map((r: string) => `- ${r}`),
    "",
    "## Matrix",
    "| Surface | Target | Role | Env | Integration | Risk | Coverage | Owning Tests |",
    "|---|---|---|---|---|---|---|---|",
    ...top.map((r) => `| ${r.surface} | \`${r.target}\` | ${r.role} | ${r.environment} | ${r.integration} | ${r.risk} | ${r.coverage} | ${r.owningTests.length ? r.owningTests.map((t) => `\`${t}\``).join(", ") : "-"} |`),
    "",
    "## Notes",
    "- Full machine-readable matrix is in `docs/testing/TEST_MATRIX.json`.",
    "- Rows with `blocked` coverage require remediation before GO decision.",
  ].join("\n");
}

function main() {
  if (!fs.existsSync(auditPath)) {
    throw new Error("Missing docs/testing/REPO_AUDIT.json. Run test:audit first.");
  }
  const audit = JSON.parse(fs.readFileSync(auditPath, "utf8"));
  const rows = buildRows(audit);
  const payload = {
    generatedAt: new Date().toISOString(),
    summary: summary(rows),
    rows,
  };

  fs.writeFileSync(matrixJsonPath, JSON.stringify(payload, null, 2));
  fs.writeFileSync(matrixMdPath, toMarkdown(rows, audit));
  console.log(`Wrote ${path.relative(root, matrixJsonPath)}`);
  console.log(`Wrote ${path.relative(root, matrixMdPath)}`);
}

main();
