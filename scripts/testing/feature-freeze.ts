import fs from "node:fs";
import path from "node:path";
import { execSync } from "node:child_process";

type Surface = {
  appPageRoutes: string[];
  appApiRoutes: string[];
  appActions: string[];
  marketingPageRoutes: string[];
  mobileAppRoutes: string[];
  marketingFeatureSectionIds: string[];
  marketingProductSlugs: string[];
};

type BaselineFile = {
  generatedAt: string;
  versionLabel: string;
  surface: Surface;
};

const root = process.cwd();
const baselinePath = path.join(root, "docs/testing/FEATURE_FREEZE_BASELINE.json");
const canonPath = path.join(root, "apps/marketing/lib/feature-canon.ts");

function trackedFiles(): string[] {
  const out = execSync("git ls-files", { cwd: root, encoding: "utf8" });
  return out
    .split("\n")
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((file) => fs.existsSync(path.join(root, file)));
}

function uniqSorted(list: string[]): string[] {
  return [...new Set(list)].sort();
}

function parseUnionLiteralBlock(source: string, marker: string): string[] {
  const idx = source.indexOf(marker);
  if (idx < 0) return [];
  const fromMarker = source.slice(idx, idx + 2500);
  const semicolonIndex = fromMarker.indexOf(";");
  const block = semicolonIndex >= 0 ? fromMarker.slice(0, semicolonIndex) : fromMarker;
  return uniqSorted(Array.from(block.matchAll(/"([a-z0-9-]+)"/g)).map((m) => m[1]));
}

function collectSurface(files: string[]): Surface {
  const appPageRoutes = files.filter(
    (f) => /^apps\/app\/app\/.*\/page\.(ts|tsx|js|jsx)$/.test(f) || /^apps\/app\/app\/page\.(ts|tsx|js|jsx)$/.test(f),
  );

  const appApiRoutes = files.filter((f) => /^apps\/app\/app\/api\/.*\/route\.(ts|js)$/.test(f));

  const appActions = files.filter((f) => /^apps\/app\/app\/actions\/.*\.(ts|tsx|js|mjs)$/.test(f));

  const marketingPageRoutes = files.filter(
    (f) => /^apps\/marketing\/app\/.*\/page\.(ts|tsx|js|jsx)$/.test(f) || /^apps\/marketing\/app\/page\.(ts|tsx|js|jsx)$/.test(f),
  );

  const mobileAppRoutes = files.filter(
    (f) => /^apps\/mobile\/app\/.*\.(ts|tsx|js|jsx)$/.test(f) && !/\/\(.*\)\/.+\.(test|spec)\./.test(f),
  );

  const canonText = fs.existsSync(canonPath) ? fs.readFileSync(canonPath, "utf8") : "";
  const marketingFeatureSectionIds = parseUnionLiteralBlock(canonText, "export interface FeatureSection {");
  const marketingProductSlugs = parseUnionLiteralBlock(canonText, "export interface ProductDetailContent {");

  return {
    appPageRoutes: uniqSorted(appPageRoutes),
    appApiRoutes: uniqSorted(appApiRoutes),
    appActions: uniqSorted(appActions),
    marketingPageRoutes: uniqSorted(marketingPageRoutes),
    mobileAppRoutes: uniqSorted(mobileAppRoutes),
    marketingFeatureSectionIds,
    marketingProductSlugs,
  };
}

function diff(current: string[], baseline: string[]) {
  const cur = new Set(current);
  const base = new Set(baseline);
  const added = current.filter((x) => !base.has(x));
  const removed = baseline.filter((x) => !cur.has(x));
  return { added, removed };
}

function compareSurface(current: Surface, baseline: Surface): string[] {
  const errors: string[] = [];

  const keys: Array<keyof Surface> = [
    "appPageRoutes",
    "appApiRoutes",
    "appActions",
    "marketingPageRoutes",
    "mobileAppRoutes",
    "marketingFeatureSectionIds",
    "marketingProductSlugs",
  ];

  for (const key of keys) {
    const d = diff(current[key], baseline[key]);
    if (d.added.length === 0 && d.removed.length === 0) continue;

    errors.push(`Surface changed: ${key}`);
    for (const item of d.added) errors.push(`  + ${item}`);
    for (const item of d.removed) errors.push(`  - ${item}`);
  }

  return errors;
}

function main() {
  const writeBaseline = process.argv.includes("--write-baseline");
  const files = trackedFiles();
  const surface = collectSurface(files);

  if (writeBaseline) {
    const baseline: BaselineFile = {
      generatedAt: new Date().toISOString(),
      versionLabel: "v1.0-feature-freeze",
      surface,
    };
    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, JSON.stringify(baseline, null, 2) + "\n");
    console.log(`Wrote feature freeze baseline: ${path.relative(root, baselinePath)}`);
    return;
  }

  if (!fs.existsSync(baselinePath)) {
    console.error("Feature freeze baseline missing. Run with --write-baseline to initialize.");
    process.exit(1);
  }

  const baseline = JSON.parse(fs.readFileSync(baselinePath, "utf8")) as BaselineFile;
  const errors = compareSurface(surface, baseline.surface);

  if (errors.length > 0) {
    console.error("Feature freeze check failed. Feature surface drift detected:");
    for (const error of errors) console.error(`- ${error}`);
    console.error("If this is an intentional feature-surface change, regenerate baseline with: pnpm test:feature-freeze:write");
    process.exit(1);
  }

  console.log(`Feature freeze check passed (${baseline.versionLabel}).`);
}

main();
