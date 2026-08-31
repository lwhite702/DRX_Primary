/**
 * Compatibility metadata for taxonomy checks. Publication uses the ID manifest
 * and renderer in scripts/featurebase; never reintroduce the historical 50 seeds.
 * WRE-92: original seeds remain in Git at d1ccc93.
 */
import manifest from "../../../docs/featurebase/help-center-manifest.json";

const categories: Record<string, string> = {
  "9257182": "getting-started",
  "5580893": "privacy",
  "4525056": "roles",
  "6393095": "customers",
  "7358320": "inventory",
  "4883754": "pos",
};
export const helpCenterData = manifest.articles.map((article) => ({
  id: article.id,
  title: article.title,
  summary: article.description,
  sourcePath: article.sourcePath,
  tags: [
    "help",
    `category:${categories[article.parentId]}`,
    `order:${article.publicOrder}`,
  ],
}));
