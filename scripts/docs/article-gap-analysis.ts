import fs from "node:fs";
import { loadHelpContent } from "../featurebase/_help-content.mjs";
import { writeJson } from "../featurebase/_client";

const { manifest, articles } = loadHelpContent();
const audit = JSON.parse(
  fs.readFileSync("docs/featurebase/source-audit.json", "utf8"),
);
const review = JSON.parse(
  fs.readFileSync("docs/featurebase/audit-review.json", "utf8"),
);
const mintlifyReceipt = JSON.parse(
  fs.readFileSync("docs/mintlify/generated-help-receipt.json", "utf8"),
);

function markdownFiles(directory: string): string[] {
  return fs.readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
    const file = `${directory}/${entry.name}`;
    if (entry.name === "_archive") return [];
    return entry.isDirectory()
      ? markdownFiles(file)
      : file.endsWith(".md")
        ? [file]
        : [];
  });
}
const inventoried = new Set(
  audit.records.map((record: any) => record.sourcePath),
);
for (const source of [
  ...markdownFiles("app-docs"),
  ...markdownFiles("docs/help-center-export/final"),
]) {
  if (!inventoried.has(source))
    throw new Error(`Unreviewed repository article: ${source}`);
}

const ids = new Set(articles.map((a: any) => a.id));
for (const record of audit.records) {
  if (!ids.has(record.replacementId) || !fs.existsSync(record.sourcePath))
    throw new Error(`Missing source disposition: ${record.sourcePath}`);
}
for (const feature of review.coverage) {
  if (
    !feature.articleIds.length ||
    feature.articleIds.some((id: string) => !ids.has(id)) ||
    feature.sources.some((source: string) => !fs.existsSync(source))
  )
    throw new Error(`Missing coverage or evidence: ${feature.topic}`);
}
const report = {
  ok: true,
  canonicalArticles: manifest.articles.length,
  repositoryRecords: audit.records.length,
  topics: review.coverage.length,
  gaps: review.productGaps,
  apiAuditComplete: review.completeApiAudit,
  mintlifySourceReady:
    mintlifyReceipt.canonicalArticleCount === 19 &&
    mintlifyReceipt.visualAssetCount === 20,
  publicationReady: false,
};
writeJson(".featurebase/gap-analysis.json", report);
console.log(JSON.stringify(report, null, 2));
