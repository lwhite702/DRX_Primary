/** WRE-92: canonical articles for read-only legacy consumers; use root tooling to publish. */
import fs from "node:fs";
import path from "node:path";
import { loadHelpContent } from "../../../scripts/featurebase/_help-content.mjs";

export interface HelpArticle {
  title: string;
  summary: string;
  tags: string[];
  content: string;
}

const categories: Record<string, string> = {
  "9257182": "getting-started", "5580893": "privacy", "4525056": "roles",
  "6393095": "customers", "7358320": "inventory", "4883754": "pos",
};
let repositoryRoot = process.cwd();
while (!fs.existsSync(path.join(repositoryRoot, "docs/featurebase/help-center-manifest.json"))) {
  const parent = path.dirname(repositoryRoot);
  if (parent === repositoryRoot) throw new Error("Run the help adapter inside the DRX repository");
  repositoryRoot = parent;
}
const canonical = loadHelpContent(repositoryRoot);
export const helpCenterData: HelpArticle[] = [
  ...canonical.articles.map((article: { id: string; title: string; description: string; sourcePath: string; parentId: string; publicOrder: number; body: string }) => ({
    id: article.id,
    title: article.title,
    summary: article.description,
    sourcePath: article.sourcePath,
    tags: ["help", `category:${categories[article.parentId]}`, `order:${article.publicOrder}`],
    content: article.body,
  })),
];
