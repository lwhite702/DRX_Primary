import fs from "node:fs";
import path from "node:path";
import { loadHelpContent, loadHelpVisuals } from "./_help-content.mjs";

const root = process.cwd();
const receiptArgument = process.argv.indexOf("--receipt");
const receiptPath = path.resolve(
  root,
  receiptArgument >= 0
    ? process.argv[receiptArgument + 1]
    : ".featurebase/browser-import/browser-receipt.json",
);
const receipt = JSON.parse(fs.readFileSync(receiptPath, "utf8"));
const visualManifest = loadHelpVisuals(root, { requirePublished: true });
const { manifest, articles, contentHash } = loadHelpContent(root, {
  requirePublishedVisuals: true,
});
const assetById = new Map(
  visualManifest.assets.map((asset) => [asset.id, asset]),
);
const expected = articles.filter(
  (article) => receipt.phase === "published" || article.visuals.length,
);

const fail = (message) => {
  throw new Error(message);
};
const same = (left, right) => JSON.stringify(left) === JSON.stringify(right);

if (
  receipt.schemaVersion !== 1 ||
  receipt.method !== "authenticated-browser-editor" ||
  !["drafts", "published"].includes(receipt.phase) ||
  receipt.helpCenterId !== manifest.helpCenterId ||
  receipt.contentHash !== contentHash ||
  !Array.isArray(receipt.articles)
)
  fail("Wrong or stale browser receipt");

if (
  receipt.articles.length !== expected.length ||
  new Set(receipt.articles.map((article) => article.id)).size !==
    receipt.articles.length
)
  fail("Browser receipt article set differs");

for (const article of expected) {
  const observed = receipt.articles.find(
    (candidate) => candidate.id === article.id,
  );
  if (!observed) fail(`Missing browser receipt article: ${article.id}`);
  const expectedVisuals = article.visuals.map((visual) => {
    const asset = assetById.get(visual.id);
    return {
      id: visual.id,
      alt: asset.alt,
      caption: asset.caption,
    };
  });
  if (
    observed.title !== article.title ||
    observed.description !== article.description ||
    !observed.savedAfterReload ||
    observed.noUnexpectedImages !== true ||
    !same(
      observed.headings,
      article.headings.map((heading) => heading.text),
    ) ||
    !same(
      observed.links,
      article.links.map((link) => link.url),
    ) ||
    !same(observed.labels, article.labels) ||
    observed.visuals.length !== expectedVisuals.length ||
    observed.visuals.some(
      (visual, index) =>
        !/^[a-z0-9-]{20,}$/.test(visual.attachmentIdentity) ||
        visual.id !== expectedVisuals[index].id ||
        visual.alt !== expectedVisuals[index].alt ||
        visual.caption !== expectedVisuals[index].caption,
    )
  )
    fail(`Browser receipt content differs: ${article.id}`);
}

if (receipt.phase === "published") {
  if (
    receipt.publicVerification?.articles !== articles.length ||
    receipt.publicVerification?.visualAssets !== visualManifest.assets.length ||
    receipt.publicVerification?.visualPlacements !==
      articles.reduce((count, article) => count + article.visuals.length, 0) ||
    receipt.publicVerification?.missingArticles !== 0 ||
    receipt.publicVerification?.unexpectedArticles !== 0
  )
    fail("Published browser verification is incomplete");
}

console.log(
  JSON.stringify({
    ok: true,
    phase: receipt.phase,
    articles: receipt.articles.length,
    contentHash,
    receiptPath,
  }),
);
