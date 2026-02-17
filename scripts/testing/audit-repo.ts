import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

type RouteKind = "page" | "api" | "loading" | "error" | "global-error" | "not-found";
type AppSurface = "app" | "marketing" | "mobile" | "mintlify";
type BoundaryType = "auth" | "db" | "tenant" | "feature_flag" | "observability";

interface RouteRecord {
  file: string;
  app: AppSurface;
  kind: RouteKind;
  owner: string;
}

interface BoundaryRecord {
  file: string;
  type: BoundaryType;
  evidence: string;
}

interface VendorRecord {
  vendor: string;
  dependency: string;
  source: string;
}

interface DeprecatedArtifact {
  file: string;
  rule: string;
}

const root = process.cwd();
const docsDir = path.join(root, "docs/testing");
const outputPath = path.join(docsDir, "REPO_AUDIT.json");

const stalePatternRules: Array<{ rule: string; pattern: RegExp }> = [
  { rule: "stale-orig", pattern: /\.orig$/i },
  { rule: "stale-rej", pattern: /\.rej$/i },
  { rule: "stale-build-log", pattern: /build_error.*\.log$/i },
  { rule: "stale-playwright-report", pattern: /^apps\/app\/playwright-report\// },
  { rule: "stale-test-results", pattern: /^apps\/app\/test-results\// },
  { rule: "stale-testsprite", pattern: /^testsprite_tests\// },
  { rule: "stale-testsprite-app", pattern: /^apps\/app\/testsprite_tests\// },
];

const boundaryRules: Array<{ type: BoundaryType; regex: RegExp; evidence: string }> = [
  { type: "auth", regex: /@clerk\//i, evidence: "Clerk auth boundary" },
  { type: "auth", regex: /\bauth\(/, evidence: "Auth context call" },
  { type: "db", regex: /@prisma|PrismaClient|\bdb\./i, evidence: "Prisma/DB access" },
  { type: "db", regex: /@supabase|createClient\(/i, evidence: "Supabase data access" },
  { type: "tenant", regex: /tenant|business_id|organization|org_id/i, evidence: "Tenant/business boundary" },
  { type: "feature_flag", regex: /feature[_-]?flag|feature gate|use-feature-flag/i, evidence: "Feature flag boundary" },
  { type: "observability", regex: /sentry|posthog|audit[_-]?log|instrumentation|trace id/i, evidence: "Observability boundary" },
];

const mandatoryRisks = [
  "Mixed auth/data model: Clerk + Prisma + Supabase compatibility surfaces",
  "Runtime mock client compatibility path must not exist in production",
  "Deprecated/stale tracked artifacts: .orig/.rej/build logs/playwright-report/testsprite suites",
];

function trackedFiles(): string[] {
  const out = execSync("git ls-files", { cwd: root, encoding: "utf8" });
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((f) => fs.existsSync(path.join(root, f)));
}

function read(file: string): string {
  return fs.readFileSync(path.join(root, file), "utf8");
}

function detectRouteKind(file: string): RouteKind | null {
  if (/\/page\.(ts|tsx)$/.test(file) || /\.mdx$/.test(file)) return "page";
  if (/\/route\.(ts|tsx)$/.test(file)) return "api";
  if (/\/loading\.(ts|tsx)$/.test(file)) return "loading";
  if (/\/global-error\.(ts|tsx)$/.test(file)) return "global-error";
  if (/\/error\.(ts|tsx)$/.test(file)) return "error";
  if (/\/not-found\.(ts|tsx)$/.test(file)) return "not-found";
  return null;
}

function collectRoutes(files: string[]): RouteRecord[] {
  const records: RouteRecord[] = [];
  for (const file of files) {
    let app: AppSurface | null = null;
    if (file.startsWith("apps/app/app/")) app = "app";
    else if (file.startsWith("apps/marketing/app/")) app = "marketing";
    else if (file.startsWith("apps/mobile/app/")) app = "mobile";
    else if (file.startsWith("mintlify/") && file.endsWith(".mdx")) app = "mintlify";
    if (!app) continue;

    const kind = detectRouteKind(file);
    if (!kind) continue;

    records.push({ file, app, kind, owner: file });
  }
  return records.sort((a, b) => a.file.localeCompare(b.file));
}

function collectBoundaries(files: string[]): BoundaryRecord[] {
  const out: BoundaryRecord[] = [];
  for (const file of files) {
    if (!/\.(ts|tsx|js|jsx|sql|prisma|md|mdx)$/.test(file)) continue;
    const text = read(file);
    for (const rule of boundaryRules) {
      if (rule.regex.test(text)) {
        out.push({ file, type: rule.type, evidence: rule.evidence });
      }
    }
  }
  const uniq = new Map<string, BoundaryRecord>();
  for (const item of out) {
    uniq.set(`${item.file}:${item.type}:${item.evidence}`, item);
  }
  return [...uniq.values()].sort((a, b) => a.file.localeCompare(b.file));
}

function collectVendors(files: string[]): VendorRecord[] {
  const vendorNeedles: Array<{ vendor: string; regex: RegExp }> = [
    { vendor: "clerk", regex: /^@clerk\//i },
    { vendor: "supabase", regex: /^@supabase\//i },
    { vendor: "prisma", regex: /^@prisma\//i },
    { vendor: "sentry", regex: /^@sentry\//i },
    { vendor: "posthog", regex: /posthog/i },
    { vendor: "stripe", regex: /^stripe$/i },
    { vendor: "upstash", regex: /^@upstash\//i },
    { vendor: "svix", regex: /^svix$/i },
    { vendor: "inngest", regex: /^inngest$/i },
    { vendor: "resend", regex: /^resend$/i },
  ];

  const packageFiles = files.filter((f) => /package\.json$/.test(f));
  const out: VendorRecord[] = [];

  for (const file of packageFiles) {
    const json = JSON.parse(read(file)) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = Object.keys({ ...(json.dependencies ?? {}), ...(json.devDependencies ?? {}) });
    for (const dep of deps) {
      for (const needle of vendorNeedles) {
        if (needle.regex.test(dep)) {
          out.push({ vendor: needle.vendor, dependency: dep, source: file });
        }
      }
    }
  }

  const uniq = new Map<string, VendorRecord>();
  for (const item of out) {
    uniq.set(`${item.vendor}:${item.dependency}:${item.source}`, item);
  }
  return [...uniq.values()].sort((a, b) => `${a.vendor}:${a.source}`.localeCompare(`${b.vendor}:${b.source}`));
}

function collectDeprecatedArtifacts(files: string[]): DeprecatedArtifact[] {
  const out: DeprecatedArtifact[] = [];
  for (const file of files) {
    for (const rule of stalePatternRules) {
      if (rule.pattern.test(file)) {
        out.push({ file, rule: rule.rule });
      }
    }
  }
  return out.sort((a, b) => a.file.localeCompare(b.file));
}

function parseRoles(files: string[]): string[] {
  const roleFile = files.find((f) => f === "apps/app/lib/auth/permissions.ts");
  if (!roleFile) return ["cashier", "supervisor", "manager", "super_admin", "owner", "admin", "staff"];
  const text = read(roleFile);
  const match = text.match(/export type Role\s*=([\s\S]*?);/);
  if (!match) return ["cashier", "supervisor", "manager", "super_admin", "owner", "admin", "staff"];
  const roles = [...new Set(Array.from(match[1].matchAll(/"([a-z_]+)"/g)).map((m) => m[1]))];
  return [...new Set([...roles, "owner", "admin", "staff"])].sort();
}

function main() {
  fs.mkdirSync(docsDir, { recursive: true });
  const files = trackedFiles();

  const routes = collectRoutes(files);
  const boundaries = collectBoundaries(files);
  const vendors = collectVendors(files);
  const deprecatedArtifacts = collectDeprecatedArtifacts(files);

  const audit = {
    schemaVersion: "2.0.0",
    generatedAt: new Date().toISOString(),
    apps: ["apps/app", "apps/marketing", "apps/mobile"],
    packages: files.filter((f) => /^packages\/[^/]+\/package\.json$/.test(f)).map((f) => f.replace(/\/package\.json$/, "")),
    roles: parseRoles(files),
    routes,
    boundaries,
    vendors,
    deprecatedArtifacts,
    mandatoryRisks,
  };

  fs.writeFileSync(outputPath, JSON.stringify(audit, null, 2));
  console.log(`Wrote ${path.relative(root, outputPath)}`);
}

main();
