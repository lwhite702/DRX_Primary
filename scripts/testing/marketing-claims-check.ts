import fs from "node:fs";
import path from "node:path";

type Failure = {
  file: string;
  message: string;
};

const root = process.cwd();

const canonicalDocPath = "docs/MARKETING_TRUE_FEATURE_LIST.md";
const claimMatrixPath = "docs/MARKETING_FEATURE_CLAIM_MATRIX.md";
const canonModulePath = "apps/marketing/lib/feature-canon.ts";

const requiredCanonicalHeadings = [
  "Fast Point of Sale",
  "Quick POS Mode",
  "Inventory That Actually Makes Sense",
  "Customer Tracking That Works",
  "Real Business Reports",
  "Team Control & Accountability",
  "Multi-Location Ready",
  "Works on Desktop and Mobile",
];

const requiredImports: Array<{ file: string; contains: string[] }> = [
  {
    file: "apps/marketing/app/page.tsx",
    contains: ['from "@/lib/feature-canon"'],
  },
  {
    file: "apps/marketing/components/marketing/features.tsx",
    contains: ['from "@/lib/feature-canon"'],
  },
  {
    file: "apps/marketing/components/marketing/landing/sections.tsx",
    contains: ['from "@/lib/feature-canon"'],
  },
  {
    file: "apps/marketing/app/product/page.tsx",
    contains: ['from "@/lib/feature-canon"'],
  },
  {
    file: "apps/marketing/app/product/sales-checkout/page.tsx",
    contains: ['from "@/lib/feature-canon"', 'productDetailCanon["sales-checkout"]'],
  },
  {
    file: "apps/marketing/app/product/inventory-control/page.tsx",
    contains: ['from "@/lib/feature-canon"', 'productDetailCanon["inventory-control"]'],
  },
  {
    file: "apps/marketing/app/product/customers-credit/page.tsx",
    contains: ['from "@/lib/feature-canon"', 'productDetailCanon["customers-credit"]'],
  },
  {
    file: "apps/marketing/app/product/operations-visibility/page.tsx",
    contains: ['from "@/lib/feature-canon"', 'productDetailCanon["operations-visibility"]'],
  },
  {
    file: "apps/marketing/app/product/team-access-security/page.tsx",
    contains: ['from "@/lib/feature-canon"', 'productDetailCanon["team-access-security"]'],
  },
];

function abs(relPath: string): string {
  return path.join(root, relPath);
}

function readFile(relPath: string): string {
  return fs.readFileSync(abs(relPath), "utf8");
}

function requireFile(relPath: string, failures: Failure[]) {
  const p = abs(relPath);
  if (!fs.existsSync(p)) {
    failures.push({ file: relPath, message: "Required file is missing" });
    return;
  }

  const size = fs.statSync(p).size;
  if (size === 0) {
    failures.push({ file: relPath, message: "Required file is empty" });
  }
}

function checkCanonicalHeadings(docText: string, moduleText: string, failures: Failure[]) {
  for (const heading of requiredCanonicalHeadings) {
    if (!docText.includes(`### ${heading}`)) {
      failures.push({
        file: canonicalDocPath,
        message: `Missing canonical heading: ${heading}`,
      });
    }

    if (!moduleText.includes(`title: "${heading}"`)) {
      failures.push({
        file: canonModulePath,
        message: `Canonical section is not represented in module: ${heading}`,
      });
    }
  }
}

function checkStatusTokens(moduleText: string, failures: Failure[]) {
  const validStatuses = new Set(["live", "beta", "planned"]);
  const statusMatches = [...moduleText.matchAll(/status:\s*"([a-z]+)"/g)].map(
    (match) => match[1],
  );

  if (statusMatches.length === 0) {
    failures.push({
      file: canonModulePath,
      message: "No status tokens found in canonical marketing module",
    });
    return;
  }

  for (const status of statusMatches) {
    if (!validStatuses.has(status)) {
      failures.push({
        file: canonModulePath,
        message: `Invalid status token: ${status}`,
      });
    }
  }
}

function checkCanonicalConsumption(failures: Failure[]) {
  for (const check of requiredImports) {
    const filePath = abs(check.file);
    if (!fs.existsSync(filePath)) {
      failures.push({ file: check.file, message: "Expected page/component file is missing" });
      continue;
    }

    const text = readFile(check.file);
    for (const expected of check.contains) {
      if (!text.includes(expected)) {
        failures.push({
          file: check.file,
          message: `Canonical consumption requirement missing: ${expected}`,
        });
      }
    }
  }
}

function main() {
  const failures: Failure[] = [];

  requireFile(canonicalDocPath, failures);
  requireFile(claimMatrixPath, failures);
  requireFile(canonModulePath, failures);

  if (failures.length > 0) {
    console.error("Marketing claims check failed:");
    for (const failure of failures) {
      console.error(`- ${failure.file}: ${failure.message}`);
    }
    process.exit(1);
  }

  const canonicalDoc = readFile(canonicalDocPath);
  const canonicalModule = readFile(canonModulePath);

  checkCanonicalHeadings(canonicalDoc, canonicalModule, failures);
  checkStatusTokens(canonicalModule, failures);
  checkCanonicalConsumption(failures);

  if (failures.length > 0) {
    console.error("Marketing claims check failed:");
    for (const failure of failures) {
      console.error(`- ${failure.file}: ${failure.message}`);
    }
    process.exit(1);
  }

  console.log("Marketing claims check passed. Canonical source and marketing surfaces are aligned.");
}

main();
