import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import fs from "node:fs";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

const require = createRequire(import.meta.url);
// Next declares the pinned sharp dependency; avoid arbitrary pnpm cache entries.
const sharp = createRequire(require.resolve("next/package.json"))("sharp");
const readJson = (root, file) => JSON.parse(fs.readFileSync(path.join(root, file), "utf8"));

function safePath(file, prefix) {
  assert.ok(typeof file === "string" && file.startsWith(prefix) &&
    !file.split("/").includes("..") && !file.includes("\\"), `Unsafe visual path: ${file}`);
  return file;
}

export async function validateMintlifyVisuals(root = process.cwd()) {
  // These retained manifests map canonical app-docs assets; no retired renderer is used.
  const manifest = readJson(root, "docs/featurebase/help-center-visuals.json");
  const receipt = readJson(root, "docs/mintlify/generated-help-receipt.json");
  assert.equal(manifest.schemaVersion, 1);
  assert.equal(manifest.assetCount, 20);
  assert.equal(manifest.assets.length, manifest.assetCount);
  const counts = { header: 0, screenshot: 0, diagram: 0 };
  const limits = { header: 300_000, screenshot: 700_000, diagram: 350_000 };
  const ids = new Set();
  const assets = new Map();
  const expectedPlacements = [];
  for (const asset of manifest.assets) {
    assert.match(asset.id, /^[a-z0-9-]+$/);
    assert.ok(!ids.has(asset.id) && !assets.has(asset.sourcePath), `Duplicate visual: ${asset.id}`);
    ids.add(asset.id);
    assets.set(safePath(asset.sourcePath, "app-docs/_assets/help-center/"), asset);
    assert.ok(Object.hasOwn(counts, asset.kind), `Unknown visual kind: ${asset.id}`);
    counts[asset.kind]++;
    const bytes = fs.readFileSync(path.join(root, asset.sourcePath));
    assert.equal(bytes.length, asset.bytes, `Visual size differs: ${asset.id}`);
    assert.equal(createHash("sha256").update(bytes).digest("hex"), asset.sha256, `Visual checksum differs: ${asset.id}`);
    assert.ok(bytes.length <= limits[asset.kind], `Visual is too large: ${asset.id}`);
    const metadata = await sharp(bytes).metadata();
    assert.equal(metadata.width, asset.width, `Visual width differs: ${asset.id}`);
    assert.equal(metadata.height, asset.height, `Visual height differs: ${asset.id}`);
    if (asset.kind === "header") {
      assert.deepEqual([metadata.width, metadata.height, metadata.format], [1600, 640, "webp"]);
    } else {
      assert.equal(metadata.format, "png");
      if (asset.kind === "diagram") assert.deepEqual([metadata.width, metadata.height], [1400, 800]);
    }
    if (asset.editableSourcePath) {
      assert.ok(fs.existsSync(path.join(root, safePath(asset.editableSourcePath, "app-docs/_assets/"))), `Editable source missing: ${asset.id}`);
    }
    if (asset.provenance === "fixture") {
      assert.equal(asset.caption, "Illustrative screen with fictional data.");
    }
    assert.ok(asset.articlePlacements?.length, `Visual has no placement: ${asset.id}`);
    for (const placement of asset.articlePlacements) expectedPlacements.push(`${placement.articleId}:${asset.id}`);
  }
  assert.deepEqual(counts, { header: 6, screenshot: 8, diagram: 6 });
  assert.equal(receipt.generated.length, 19);
  assert.equal(new Set(receipt.generated.map((article) => article.articleId)).size, 19);
  const actualPlacements = [];
  for (const article of receipt.generated) {
    const source = fs.readFileSync(path.join(root, safePath(article.sourcePath, "app-docs/")), "utf8");
    for (const match of source.matchAll(/!\[([^\]\n]*)\]\(([^\s()]+)\)/g)) {
      const assetPath = path.posix.normalize(path.posix.join(path.posix.dirname(article.sourcePath), match[2]));
      const asset = assets.get(assetPath);
      assert.ok(asset, `Undeclared canonical visual: ${match[2]}`);
      assert.ok(match[1].trim(), `Missing canonical alt text: ${asset.id}`);
      if (asset.provenance === "fixture") assert.ok(source.includes(asset.caption), `Fixture caption missing: ${asset.id}`);
      actualPlacements.push(`${article.articleId}:${asset.id}`);
    }
  }
  assert.equal(actualPlacements.length, 23);
  assert.deepEqual(actualPlacements.sort(), expectedPlacements.sort(), "Canonical visual placements differ");
  return { assets: assets.size, placements: actualPlacements.length, counts };
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  console.log(JSON.stringify({ ok: true, ...await validateMintlifyVisuals() }));
}
