import fs from "node:fs";
import path from "node:path";

type Finding = { code: string; message: string; file?: string };
type NavGroup = { group: string; pages: string[] };
type Redirect = { source: string; destination: string; permanent?: boolean };
type DocsConfig = {
  name: string;
  theme: string;
  colors: { primary: string; light?: string; dark?: string };
  appearance?: { default?: string; strict?: boolean };
  fonts?: { family?: string };
  background?: { color?: { dark?: string; light?: string } };
  navigation: { groups?: NavGroup[] };
  redirects?: Redirect[];
};
type Migration = {
  canonicalArticleCount: number;
  visualAssetCount: number;
  legacyPages: Array<{ source: string; destination: string; action: string }>;
  retainedReferencePages: string[];
};
type Receipt = {
  canonicalArticleCount: number;
  visualAssetCount: number;
  generated: Array<{
    articleId: string;
    sourcePath: string;
    mintlifyPath: string;
    route: string;
  }>;
};

const root = process.cwd();
const mintlifyRoot = path.join(root, "mintlify");
const configPath = path.join(mintlifyRoot, "docs.json");
const migrationPath = path.join(root, "docs/mintlify/help-center-migration.json");
const receiptPath = path.join(root, "docs/mintlify/generated-help-receipt.json");
const screenshotBriefPath = path.join(root, "docs/mintlify/GEMINI_SCREENSHOT_BRIEF.md");

const forbiddenPhrases = [
  "DRX CRM",
  "Business CRM Mode",
  "secure terminal access",
  "system entry",
  "streamline your operations",
  "unlock growth",
  "all-in-one platform",
];

function readJson<T>(filePath: string): T {
  return JSON.parse(fs.readFileSync(filePath, "utf8")) as T;
}

function pageFile(route: string): string {
  return path.join(mintlifyRoot, route.replace(/^\//, "") + ".mdx");
}

function collectMdx(directory: string): string[] {
  const files: string[] = [];
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...collectMdx(absolute));
    else if (entry.name.endsWith(".mdx")) files.push(absolute);
  }
  return files;
}

function routeForFile(filePath: string): string {
  return path
    .relative(mintlifyRoot, filePath)
    .replaceAll(path.sep, "/")
    .replace(/\.mdx$/, "");
}

function stripFragment(value: string): string {
  return value.split("#")[0]?.split("?")[0] ?? value;
}

function internalLinks(markdown: string): string[] {
  const markdownLinks = [...markdown.matchAll(/(?<!!)\[[^\]]+\]\((\/[^)]+)\)/g)].map(
    (match) => match[1],
  );
  const componentLinks = [...markdown.matchAll(/\bhref=["'](\/[^"']+)["']/g)].map(
    (match) => match[1],
  );
  return [...markdownLinks, ...componentLinks];
}

function markdownImages(markdown: string): Array<{ alt: string; source: string }> {
  return [...markdown.matchAll(/!\[([^\]]*)\]\(([^)]+)\)/g)].map((match) => ({
    alt: match[1].trim(),
    source: match[2].trim(),
  }));
}

function main() {
  const findings: Finding[] = [];
  for (const required of [
    configPath,
    migrationPath,
    receiptPath,
    screenshotBriefPath,
    path.join(mintlifyRoot, "style.css"),
  ]) {
    if (!fs.existsSync(required)) {
      findings.push({ code: "REQUIRED_FILE_MISSING", message: path.relative(root, required) });
    }
  }
  if (findings.length) return report(findings, 0);

  const config = readJson<DocsConfig>(configPath);
  const migration = readJson<Migration>(migrationPath);
  const receipt = readJson<Receipt>(receiptPath);
  const groups = config.navigation.groups ?? [];
  const routes = groups.flatMap((group) => group.pages);
  const routeSet = new Set(routes);

  const expectedBrand = {
    name: "DRX Help Center",
    theme: "mint",
    primary: "#526600",
    darkBackground: "#0A0A0A",
    lightBackground: "#F7F7F4",
    font: "Plus Jakarta Sans",
  };
  if (config.name !== expectedBrand.name) findings.push({ code: "BRAND_NAME", message: "Expected " + expectedBrand.name });
  if (config.theme !== expectedBrand.theme) findings.push({ code: "BRAND_THEME", message: "Expected " + expectedBrand.theme });
  if (config.colors.primary !== expectedBrand.primary) findings.push({ code: "BRAND_PRIMARY", message: "Expected " + expectedBrand.primary });
  if (config.background?.color?.dark !== expectedBrand.darkBackground) findings.push({ code: "BRAND_DARK", message: "Expected " + expectedBrand.darkBackground });
  if (config.background?.color?.light !== expectedBrand.lightBackground) findings.push({ code: "BRAND_LIGHT", message: "Expected " + expectedBrand.lightBackground });
  if (config.fonts?.family !== expectedBrand.font) findings.push({ code: "BRAND_FONT", message: "Expected " + expectedBrand.font });
  if (config.appearance?.default !== "dark" || config.appearance?.strict !== false) {
    findings.push({ code: "THEME_TOGGLE", message: "Default to dark while retaining the light/dark toggle." });
  }

  if (migration.canonicalArticleCount !== 19 || receipt.canonicalArticleCount !== 19) {
    findings.push({ code: "ARTICLE_COUNT", message: "Canonical and generated article counts must both be 19." });
  }
  if (migration.visualAssetCount !== 20 || receipt.visualAssetCount !== 20) {
    findings.push({ code: "ASSET_COUNT", message: "Canonical and generated visual counts must both be 20." });
  }
  if (new Set(receipt.generated.map((entry) => entry.articleId)).size !== 19) {
    findings.push({ code: "ARTICLE_IDS", message: "Generated article IDs must be unique." });
  }
  for (const entry of receipt.generated) {
    if (!routeSet.has(entry.route.replace(/^\//, ""))) {
      findings.push({ code: "GENERATED_PAGE_NOT_IN_NAV", message: entry.route });
    }
    if (!fs.existsSync(path.join(root, entry.sourcePath))) {
      findings.push({ code: "SOURCE_MISSING", message: entry.sourcePath });
    }
  }

  const redirectMap = new Map((config.redirects ?? []).map((item) => [item.source, item.destination]));
  for (const legacy of migration.legacyPages) {
    if (redirectMap.get(legacy.source) !== legacy.destination) {
      findings.push({ code: "REDIRECT_MISMATCH", message: legacy.source + " -> " + legacy.destination });
    }
    if (!routeSet.has(legacy.destination.replace(/^\//, ""))) {
      findings.push({ code: "REDIRECT_TARGET_MISSING", message: legacy.destination });
    }
  }
  if (redirectMap.size !== migration.legacyPages.length) {
    findings.push({ code: "REDIRECT_COUNT", message: "docs.json redirects must match the migration inventory exactly." });
  }

  for (const route of routes) {
    const filePath = pageFile(route);
    if (!fs.existsSync(filePath)) {
      findings.push({ code: "NAV_PAGE_MISSING", message: route });
      continue;
    }
    const markdown = fs.readFileSync(filePath, "utf8");
    if (!/^---\n[\s\S]*?\n---\n/.test(markdown)) {
      findings.push({ code: "FRONTMATTER_MISSING", message: route, file: filePath });
    }
    for (const phrase of forbiddenPhrases) {
      if (markdown.toLowerCase().includes(phrase.toLowerCase())) {
        findings.push({ code: "FORBIDDEN_PHRASE", message: phrase, file: filePath });
      }
    }
    if (/drx\.featurebase\.app\/en\/help\/articles\//i.test(markdown)) {
      findings.push({ code: "FEATUREBASE_ARTICLE_LINK", message: "Use the canonical Mintlify route.", file: filePath });
    }
    if (/\]\((?:\.\.\/|\.\/|\/Users\/|\/Volumes\/|file:|data:)/i.test(markdown)) {
      findings.push({ code: "UNSAFE_LOCAL_LINK", message: "Use a root-relative Mintlify path.", file: filePath });
    }
    for (const href of internalLinks(markdown)) {
      const target = stripFragment(href).replace(/^\//, "");
      if (target && !routeSet.has(target)) {
        findings.push({ code: "BROKEN_INTERNAL_LINK", message: href, file: filePath });
      }
    }
    for (const image of markdownImages(markdown)) {
      if (!image.alt) findings.push({ code: "IMAGE_ALT_MISSING", message: image.source, file: filePath });
      if (!image.source.startsWith("/images/")) {
        findings.push({ code: "IMAGE_PATH", message: image.source, file: filePath });
        continue;
      }
      const imagePath = path.join(mintlifyRoot, image.source.replace(/^\//, ""));
      if (!fs.existsSync(imagePath)) {
        findings.push({ code: "IMAGE_MISSING", message: image.source, file: filePath });
      }
    }
  }

  const navigatedFiles = new Set(routes.map((route) => pageFile(route)));
  for (const filePath of collectMdx(mintlifyRoot)) {
    if (!navigatedFiles.has(filePath)) {
      findings.push({ code: "ORPHAN_MDX", message: routeForFile(filePath), file: filePath });
    }
  }

  const brief = fs.readFileSync(screenshotBriefPath, "utf8");
  const requiredCaptureKeys = [
    "onboarding-review",
    "dashboard-overview",
    "reports-period",
    "support-entry",
    "privacy-settings",
    "workspace-selector",
    "manage-team",
    "customer-create",
    "record-payment",
    "inventory-intake",
    "inventory-adjustment",
    "quick-sale-cart",
    "quick-sale-payment",
    "sale-details",
    "delivery-details",
    "barcode-input",
  ];
  for (const key of requiredCaptureKeys) {
    if (!brief.includes("`" + key + "`")) {
      findings.push({ code: "CAPTURE_BRIEF_GAP", message: key, file: screenshotBriefPath });
    }
  }
  if (!brief.includes("Do not capture **DRX Intelligence**")) {
    findings.push({ code: "CAPTURE_HOLD_MISSING", message: "The unverified AI and purchase-order capture hold is required." });
  }

  report(findings, routes.length);
}

function report(findings: Finding[], pages: number): never | void {
  if (findings.length) {
    console.error("Mintlify docs audit failed with " + findings.length + " finding(s).");
    for (const finding of findings) {
      const suffix = finding.file ? " [" + path.relative(root, finding.file) + "]" : "";
      console.error("- " + finding.code + ": " + finding.message + suffix);
    }
    process.exit(1);
  }
  console.log("Mintlify docs audit passed: " + pages + " pages, 19 canonical guides, 20 visual assets, and 16 Gemini capture specs checked.");
}

main();
