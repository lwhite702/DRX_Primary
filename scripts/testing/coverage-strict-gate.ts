import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const matrixPath = path.join(root, "docs/testing/TEST_MATRIX.json");

const requiredTestFiles = [
  "apps/app/tests/e2e/auth-routing.spec.ts",
  "apps/app/tests/e2e/auth-routing-authenticated.spec.ts",
  "apps/app/tests/e2e/feature-flags.spec.ts",
  "apps/app/tests/e2e/help-center-smoke.spec.ts",
  "apps/app/tests/e2e/quick-pos-required.spec.ts",
  "scripts/testing/metadata-seo-contract-check.ts",
  "scripts/testing/login-surface-check.ts",
  "scripts/testing/observability-contract-check.ts",
  "scripts/testing/feature-flags-parity-check.ts",
  "scripts/testing/posthog-flags-parity-check.ts",
];

const criticalTargets = [
  "apps/app/app/login/[[...rest]]/page.tsx",
  "apps/app/app/register/[[...rest]]/page.tsx",
  "apps/app/app/(app)/admin/features/page.tsx",
  "apps/app/app/api/ai/analyze/route.ts",
  "apps/app/app/api/ai/product-intelligence/route.ts",
  "apps/marketing/app/login/page.tsx",
  "apps/marketing/app/page.tsx",
  "apps/mobile/app/login.tsx",
  "apps/mobile/app/(tabs)/index.tsx",
];

type Row = {
  target: string;
  coverage: "none" | "partial" | "covered" | "blocked";
};

function fail(msg: string): never {
  console.error(`Strict coverage gate failed: ${msg}`);
  process.exit(1);
}

function main() {
  for (const rel of requiredTestFiles) {
    if (!fs.existsSync(path.join(root, rel))) {
      fail(`Missing required test/check file: ${rel}`);
    }
  }

  if (!fs.existsSync(matrixPath)) {
    fail("Missing docs/testing/TEST_MATRIX.json (run pnpm test:matrix)");
  }

  const matrix = JSON.parse(fs.readFileSync(matrixPath, "utf8")) as { rows?: Row[] };
  const rows = matrix.rows || [];

  if (rows.length === 0) {
    fail("Matrix has no rows");
  }

  for (const target of criticalTargets) {
    const targetRows = rows.filter((r) => r.target === target);
    if (targetRows.length === 0) {
      fail(`Critical target missing from matrix: ${target}`);
    }

    const hasCoverage = targetRows.some(
      (r) => r.coverage === "covered" || r.coverage === "partial",
    );

    if (!hasCoverage) {
      fail(`Critical target has no test coverage: ${target}`);
    }
  }

  console.log("Strict coverage gate passed.");
}

main();
