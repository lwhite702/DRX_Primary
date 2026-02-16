import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const docsDir = path.join(root, "docs/testing");
const outputPath = path.join(docsDir, "REPO_AUDIT.json");

const IGNORE_DIRS = new Set([
  ".git",
  "node_modules",
  ".next",
  "dist",
  "coverage",
  ".turbo",
  ".expo",
  "playwright-report",
  "test-results",
]);

const stalePatterns = [/\.orig$/i, /\.rej$/i, /build_error.*\.log$/i, /playwright-report\//i, /test-results\//i, /testsprite_tests\//i];

function walk(dir: string, files: string[] = []): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    const relative = path.relative(root, absolute).replace(/\\/g, "/");
    if (entry.isDirectory()) {
      if (IGNORE_DIRS.has(entry.name)) continue;
      walk(absolute, files);
      continue;
    }
    files.push(relative);
  }
  return files;
}

function listDirs(base: string): string[] {
  const full = path.join(root, base);
  if (!fs.existsSync(full)) return [];
  return fs
    .readdirSync(full, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => `${base}/${d.name}`)
    .sort();
}

function collectRoutes(base: string): string[] {
  const full = path.join(root, base);
  if (!fs.existsSync(full)) return [];
  const files = walk(full);
  return files
    .filter((f) => /\/(page|route|loading|error|global-error|not-found)\.tsx?$/.test(f))
    .sort();
}

function parseRoles(): string[] {
  const roleFile = path.join(root, "apps/app/lib/auth/permissions.ts");
  if (!fs.existsSync(roleFile)) return [];
  const text = fs.readFileSync(roleFile, "utf8");
  const m = text.match(/export type Role\s*=([\s\S]*?);/);
  if (!m) return [];
  return [...new Set(Array.from(m[1].matchAll(/"([a-z_]+)"/g)).map((x) => x[1]))].sort();
}

function detectIntegrations(): string[] {
  const packageFiles = [
    "package.json",
    ...listDirs("apps").map((d) => `${d}/package.json`),
    ...listDirs("packages").map((d) => `${d}/package.json`),
  ].filter((f) => fs.existsSync(path.join(root, f)));

  const vendorMap: Array<{ id: string; needle: RegExp }> = [
    { id: "clerk", needle: /@clerk\//i },
    { id: "supabase", needle: /@supabase\//i },
    { id: "prisma", needle: /@prisma\//i },
    { id: "sentry", needle: /@sentry\//i },
    { id: "posthog", needle: /posthog/i },
    { id: "aws", needle: /@aws-sdk\//i },
    { id: "resend", needle: /resend/i },
    { id: "upstash", needle: /@upstash\//i },
    { id: "svix", needle: /svix/i },
    { id: "stripe", needle: /stripe/i },
    { id: "inngest", needle: /inngest/i },
  ];

  const found = new Set<string>();
  for (const pkgPath of packageFiles) {
    const json = JSON.parse(fs.readFileSync(path.join(root, pkgPath), "utf8")) as {
      dependencies?: Record<string, string>;
      devDependencies?: Record<string, string>;
    };
    const deps = Object.keys({ ...(json.dependencies ?? {}), ...(json.devDependencies ?? {}) });
    for (const dep of deps) {
      for (const vendor of vendorMap) {
        if (vendor.needle.test(dep)) found.add(vendor.id);
      }
    }
  }
  return [...found].sort();
}

function collectFeatureFlags(files: string[]): string[] {
  const hits = files.filter((f) => {
    if (!/\.(ts|tsx|sql)$/.test(f)) return false;
    const absolute = path.join(root, f);
    try {
      const text = fs.readFileSync(absolute, "utf8");
      return /feature_flags|use-feature-flag|feature gate|feature flag/i.test(text);
    } catch {
      return false;
    }
  });
  return hits.sort();
}

function collectAuthBoundaries(files: string[]): string[] {
  const hits = files.filter((f) => {
    if (!/\.(ts|tsx)$/.test(f)) return false;
    if (!f.startsWith("apps/app/")) return false;
    const text = fs.readFileSync(path.join(root, f), "utf8");
    return /auth\(|clerkMiddleware|@clerk\/|protectRoute|hasPermission|resolveAuthContext/i.test(text);
  });
  return hits.sort();
}

function collectDbAccess(files: string[]): string[] {
  const hits = files.filter((f) => {
    if (!/\.(ts|tsx|sql|prisma)$/.test(f)) return false;
    if (!f.startsWith("apps/app/") && !f.startsWith("packages/")) return false;
    const text = fs.readFileSync(path.join(root, f), "utf8");
    return /@prisma|PrismaClient|db\.|supabase|createClient\(|migration|schema\.prisma/i.test(text);
  });
  return hits.sort();
}

function collectObservability(files: string[]): string[] {
  const hits = files.filter((f) => {
    if (!/\.(ts|tsx)$/.test(f)) return false;
    const text = fs.readFileSync(path.join(root, f), "utf8");
    return /sentry|posthog|audit_log|system_audit_log|instrumentation|errorTracker/i.test(text);
  });
  return hits.sort();
}

function collectDeprecated(files: string[]): string[] {
  const stale = files.filter((f) => stalePatterns.some((p) => p.test(f)));
  const deprecatedMentions = files.filter((f) => {
    if (!/\.(ts|tsx|md|sql|prisma)$/.test(f)) return false;
    try {
      const text = fs.readFileSync(path.join(root, f), "utf8");
      return /deprecated|preview feature|legacy supabase|mock client/i.test(text);
    } catch {
      return false;
    }
  });
  return [...new Set([...stale, ...deprecatedMentions])].sort();
}

function collectExperimental(files: string[]): string[] {
  return files
    .filter((f) => {
      if (!/\.(ts|tsx|md)$/.test(f)) return false;
      try {
        const text = fs.readFileSync(path.join(root, f), "utf8");
        return /experimental|demo\//i.test(text) || /\/(demo)\//.test(f);
      } catch {
        return false;
      }
    })
    .sort();
}

function main() {
  fs.mkdirSync(docsDir, { recursive: true });
  const files = walk(root);

  const audit = {
    generatedAt: new Date().toISOString(),
    apps: listDirs("apps"),
    packages: listDirs("packages"),
    docs: ["docs", "mintlify"].filter((d) => fs.existsSync(path.join(root, d))),
    routes: {
      app: collectRoutes("apps/app/app"),
      marketing: collectRoutes("apps/marketing/app"),
      mobile: collectRoutes("apps/mobile/app"),
    },
    roles: parseRoles(),
    integrations: detectIntegrations(),
    authBoundaries: collectAuthBoundaries(files),
    dbAccess: collectDbAccess(files),
    featureFlags: collectFeatureFlags(files),
    observability: collectObservability(files),
    experimental: collectExperimental(files),
    deprecatedOrStale: collectDeprecated(files),
    mandatoryRisks: [
      "Mixed auth/data model: Clerk + Prisma + Supabase compatibility surfaces",
      "Runtime mock client present in apps/app/lib/supabase/client.ts",
      "Deprecated/stale tracked artifacts: .orig/.rej/build logs/playwright-report/testsprite suites",
    ],
  };

  fs.writeFileSync(outputPath, JSON.stringify(audit, null, 2));
  console.log(`Wrote ${path.relative(root, outputPath)}`);
}

main();
