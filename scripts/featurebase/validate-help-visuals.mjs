import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";
import { loadHelpContent, loadHelpVisuals } from "./_help-content.mjs";

const root = process.cwd();

async function loadSharp() {
  try {
    return (await import("sharp")).default;
  } catch {
    const pnpmRoot = path.join(
      fs.realpathSync(path.join(root, "node_modules")),
      ".pnpm",
    );
    const packageDir = fs
      .readdirSync(pnpmRoot)
      .find((entry) => entry.startsWith("sharp@"));
    if (!packageDir)
      throw new Error("sharp is required to validate Help Center visuals");
    return (
      await import(
        pathToFileURL(
          path.join(pnpmRoot, packageDir, "node_modules/sharp/lib/index.js"),
        ).href
      )
    ).default;
  }
}

const publication = process.argv.includes("--publication");
const manifest = loadHelpVisuals(root, { requirePublished: publication });
const sharp = await loadSharp();
const counts = { header: 0, screenshot: 0, diagram: 0 };
const limits = { header: 300_000, screenshot: 700_000, diagram: 350_000 };

for (const asset of manifest.assets) {
  counts[asset.kind] += 1;
  const metadata = await sharp(path.join(root, asset.sourcePath)).metadata();
  if (metadata.width !== asset.width || metadata.height !== asset.height)
    throw new Error(`Visual dimensions differ: ${asset.id}`);
  if (asset.bytes > limits[asset.kind])
    throw new Error(`Visual is too large: ${asset.id}`);
  if (
    asset.kind === "header" &&
    (asset.width !== 1600 || asset.height !== 640 || metadata.format !== "webp")
  )
    throw new Error(`Header format differs: ${asset.id}`);
  if (
    asset.kind === "diagram" &&
    (asset.width !== 1400 || asset.height !== 800 || metadata.format !== "png")
  )
    throw new Error(`Diagram format differs: ${asset.id}`);
  if (asset.kind === "screenshot" && metadata.format !== "png")
    throw new Error(`Screenshot format differs: ${asset.id}`);
  if (
    asset.editableSourcePath &&
    !fs.existsSync(path.join(root, asset.editableSourcePath))
  )
    throw new Error(`Editable visual source is missing: ${asset.id}`);
}

if (
  JSON.stringify(counts) !==
  JSON.stringify({ header: 6, screenshot: 8, diagram: 6 })
)
  throw new Error("Help Center visual type counts differ");

const content = loadHelpContent(root, { requirePublishedVisuals: publication });
const placements = content.articles.reduce(
  (sum, article) => sum + article.visuals.length,
  0,
);
if (placements !== 23)
  throw new Error(`Expected 23 visual placements, found ${placements}`);

console.log(
  JSON.stringify({
    ok: true,
    assets: manifest.assets.length,
    placements,
    counts,
    publicationReady: publication,
  }),
);
