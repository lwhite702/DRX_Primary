import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "../..");
const manifestPath = path.join(root, "docs/featurebase/help-center-manifest.json");
const visualManifestPath = path.join(root, "docs/featurebase/help-center-visuals.json");
const migrationPath = path.join(root, "docs/mintlify/help-center-migration.json");
const mintlifyRoot = path.join(root, "mintlify");

const articleConfig = {
  "1633388": { route: "start/get-started-with-drx", icon: "flag", mode: "wide" },
  "2502678": { route: "start/dashboard-and-reports", icon: "chart-no-axes-combined" },
  "2070517": { route: "start/help-and-support", icon: "life-buoy", mode: "wide" },
  "3489602": { route: "start/troubleshoot-dashboard-and-reports", icon: "chart-no-axes-combined", mode: "wide" },
  "6417807": { route: "privacy/privacy-and-minimal-data", icon: "eye-off" },
  "3948745": { route: "access/troubleshoot-workspaces-and-access", icon: "key-round" },
  "4735029": { route: "access/switch-workspaces-and-check-access", icon: "building-2" },
  "1831819": { route: "customers/customers-and-store-credit", icon: "users" },
  "9156766": { route: "customers/troubleshoot-customers-and-credit", icon: "circle-alert" },
  "6300641": { route: "inventory/inventory-intake-and-adjustments", icon: "package-open" },
  "0272622": { route: "inventory/troubleshoot-inventory-and-audit", icon: "clipboard-check" },
  "2995914": { route: "inventory/drx-intelligence", icon: "sparkles" },
  "3974136": { route: "inventory/purchase-orders-beta", icon: "clipboard-list" },
  "9003136": { route: "inventory/troubleshoot-ai-intelligence", icon: "message-circle-warning" },
  "0236106": { route: "sales/quick-sale-checkout", icon: "shopping-cart" },
  "5281725": { route: "sales/sales-history-and-receipts", icon: "receipt-text" },
  "3230948": { route: "sales/troubleshoot-checkout-and-payments", icon: "triangle-alert" },
  "7723456": { route: "sales/sales-and-deliveries-beta", icon: "truck" },
  "2709969": { route: "sales/connect-barcode-scanners", icon: "scan-barcode" },
};

function sha256(value) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function parseFrontmatter(markdown, sourcePath) {
  const match = markdown.match(/^---\n([\s\S]*?)\n---\n*/);
  if (!match) throw new Error(`Missing frontmatter: ${sourcePath}`);
  const title = match[1].match(/^title:\s*["'](.+)["']\s*$/m)?.[1];
  const description = match[1].match(/^description:\s*["'](.+)["']\s*$/m)?.[1];
  if (!title || !description) throw new Error(`Incomplete frontmatter: ${sourcePath}`);
  return { title, description, body: markdown.slice(match[0].length) };
}

function escapeFrontmatter(value) {
  return value.replaceAll("\\", "\\\\").replaceAll('"', '\\"');
}

function transformBody(body, articleRoutes, sourceRoutes, sourcePath) {
  let transformed = body.replace(
    /\(\.\.\/_assets\/help-center\/([^)]+)\)/g,
    "(/images/help-center/$1)",
  );
  transformed = transformed.replace(
    /https:\/\/drx\.featurebase\.app\/en\/help\/articles\/(\d+)(?:-[^\s)#]+)?/g,
    (_match, id) => {
      const route = articleRoutes.get(id);
      if (!route) throw new Error(`Unknown Featurebase article link: ${id}`);
      return `/${route}`;
    },
  );
  transformed = transformed.replace(/\]\(([^)]+\.md(?:#[^)]*)?)\)/g, (match, target) => {
    if (/^(?:https?:|mailto:|\/)/i.test(target)) return match;
    const [relativePath, fragment] = target.split("#", 2);
    const absolutePath = path.resolve(path.dirname(path.join(root, sourcePath)), relativePath);
    const canonicalPath = path.relative(root, absolutePath).split(path.sep).join("/");
    const route = sourceRoutes.get(canonicalPath);
    if (!route) throw new Error(`Unknown canonical help source link in ${sourcePath}: ${target}`);
    return `](/${route}${fragment ? `#${fragment}` : ""})`;
  });
  return transformed.trimEnd() + "\n";
}

function build() {
  const manifest = readJson(manifestPath);
  const visuals = readJson(visualManifestPath);
  const migration = readJson(migrationPath);
  const articleRoutes = new Map(
    Object.entries(articleConfig).map(([id, config]) => [id, config.route]),
  );
  const sourceRoutes = new Map(
    manifest.articles.map((article) => [article.sourcePath, articleConfig[article.id].route]),
  );

  if (manifest.articles.length !== 19) {
    throw new Error(`Expected 19 canonical articles, found ${manifest.articles.length}`);
  }
  if (visuals.assets.length !== 20) {
    throw new Error(`Expected 20 visual assets, found ${visuals.assets.length}`);
  }

  const generated = [];
  for (const article of manifest.articles) {
    const config = articleConfig[article.id];
    if (!config) throw new Error(`Missing Mintlify route for article ${article.id}`);
    const sourceAbsolute = path.join(root, article.sourcePath);
    const source = fs.readFileSync(sourceAbsolute, "utf8");
    const parsed = parseFrontmatter(source, article.sourcePath);
    if (parsed.title !== article.title || parsed.description !== article.description) {
      throw new Error(`Manifest frontmatter mismatch: ${article.sourcePath}`);
    }
    const modeLine = config.mode ? `\nmode: "${config.mode}"` : "";
    const content = `---\ntitle: "${escapeFrontmatter(parsed.title)}"\ndescription: "${escapeFrontmatter(parsed.description)}"\nicon: "${config.icon}"${modeLine}\n---\n\n${transformBody(parsed.body, articleRoutes, sourceRoutes, article.sourcePath)}`;
    const outputPath = path.join(mintlifyRoot, `${config.route}.mdx`);
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, content);
    generated.push({
      articleId: article.id,
      title: article.title,
      sourcePath: article.sourcePath,
      mintlifyPath: `mintlify/${config.route}.mdx`,
      route: `/${config.route}`,
      sourceSha256: sha256(source),
      outputSha256: sha256(content),
    });
  }

  const sourceAssetRoot = path.join(root, "app-docs/_assets/help-center");
  const outputAssetRoot = path.join(mintlifyRoot, "images/help-center");
  fs.rmSync(outputAssetRoot, { recursive: true, force: true });
  fs.cpSync(sourceAssetRoot, outputAssetRoot, { recursive: true });

  const receipt = {
    schemaVersion: 1,
    canonicalArticleCount: generated.length,
    visualAssetCount: visuals.assets.length,
    generated,
    legacyRedirectCount: migration.legacyPages.length,
  };
  fs.mkdirSync(path.join(root, "docs/mintlify"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "docs/mintlify/generated-help-receipt.json"),
    JSON.stringify(receipt, null, 2) + "\n",
  );
  return receipt;
}

const check = process.argv.includes("--check");
if (check) {
  const before = new Map();
  for (const config of Object.values(articleConfig)) {
    const filePath = path.join(mintlifyRoot, `${config.route}.mdx`);
    before.set(filePath, fs.existsSync(filePath) ? fs.readFileSync(filePath) : null);
  }
  const receiptPath = path.join(root, "docs/mintlify/generated-help-receipt.json");
  before.set(receiptPath, fs.existsSync(receiptPath) ? fs.readFileSync(receiptPath) : null);
  build();
  const changed = [...before.entries()].filter(([filePath, value]) => {
    const after = fs.existsSync(filePath) ? fs.readFileSync(filePath) : null;
    return value === null || after === null || !value.equals(after);
  });
  if (changed.length) {
    console.error("Mintlify help output is out of date:");
    for (const [filePath] of changed) console.error(`- ${path.relative(root, filePath)}`);
    process.exit(1);
  }
  console.log("Mintlify help output matches the 19 canonical articles and 20 visual assets.");
} else {
  const receipt = build();
  console.log(`Generated ${receipt.canonicalArticleCount} Mintlify guides and copied ${receipt.visualAssetCount} visual assets.`);
}
