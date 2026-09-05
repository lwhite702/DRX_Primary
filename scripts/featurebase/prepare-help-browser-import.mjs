import fs from "node:fs";
import path from "node:path";
import {
  contentFingerprint,
  loadHelpContent,
  loadHelpVisuals,
  sha256,
} from "./_help-content.mjs";

const root = process.cwd();
const outputArgument = process.argv.indexOf("--out");
const outputDirectory = path.resolve(
  root,
  outputArgument >= 0
    ? process.argv[outputArgument + 1]
    : ".featurebase/browser-import",
);

const visualManifest = loadHelpVisuals(root, { requirePublished: true });
const { manifest, articles, contentHash } = loadHelpContent(root, {
  requirePublishedVisuals: true,
});
const assetById = new Map(
  visualManifest.assets.map((asset) => [asset.id, asset]),
);

const payload = {
  schemaVersion: 1,
  method: "authenticated-browser-editor",
  generatedAt: new Date().toISOString(),
  helpCenterId: manifest.helpCenterId,
  contentHash,
  articleCount: articles.length,
  visualAssetCount: visualManifest.assets.length,
  visualPlacementCount: articles.reduce(
    (count, article) => count + article.visuals.length,
    0,
  ),
  actionBoundary:
    "Preparing and saving drafts is allowed. Publishing remains a separate confirmed browser action.",
  articles: articles.map((article) => ({
    id: article.id,
    editUrl: `${manifest.origin}/dashboard/articles/${manifest.helpCenterId}/${article.id}`,
    publicUrl: article.publicUrl,
    parentId: article.parentId,
    publicOrder: article.publicOrder,
    title: article.title,
    description: article.description,
    body: article.body,
    fingerprint: contentFingerprint(article),
    headings: article.headings.map((heading) => heading.text),
    links: article.links.map((link) => link.url),
    labels: article.labels,
    visuals: article.visuals.map((visual) => {
      const asset = assetById.get(visual.id);
      const placement = asset.articlePlacements.find(
        (candidate) => candidate.articleId === article.id,
      );
      return {
        id: visual.id,
        kind: asset.kind,
        sourcePath: asset.sourcePath,
        placement: placement.placement,
        heading: placement.heading,
        attachmentIdentity: asset.featurebase.attachmentIdentity,
        publicUrl: asset.featurebase.publicUrl,
        alt: asset.alt,
        caption: asset.caption,
      };
    }),
  })),
};

fs.mkdirSync(outputDirectory, { recursive: true });
for (const article of payload.articles) {
  fs.writeFileSync(
    path.join(outputDirectory, `${article.id}.html`),
    `${article.body}\n`,
  );
}
const indexPath = path.join(outputDirectory, "index.json");
fs.writeFileSync(indexPath, `${JSON.stringify(payload, null, 2)}\n`);
fs.writeFileSync(
  path.join(outputDirectory, "SHA256SUM"),
  `${sha256(fs.readFileSync(indexPath))}  index.json\n`,
);

console.log(
  JSON.stringify({
    ok: true,
    outputDirectory,
    articles: payload.articleCount,
    articlesWithVisuals: payload.articles.filter(
      (article) => article.visuals.length,
    ).length,
    visualAssets: payload.visualAssetCount,
    visualPlacements: payload.visualPlacementCount,
    contentHash,
  }),
);
