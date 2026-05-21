import path from "path";
import { fbRequest, type FbList, writeJson, writeText } from "./_client";

type Collection = { id: string; name: string; description?: string };
type Article = {
  id: string;
  title: string;
  slug?: string;
  description?: string;
  body?: string;
  parentId?: string;
  state?: string;
  updatedAt?: string;
  featurebaseUrl?: string;
};

async function main() {
  const outDir = path.resolve(
    process.cwd(),
    process.argv[2] ?? "docs/help-center-export/raw",
  );

  const collections = await fbRequest<FbList<Collection>>(
    "GET",
    "/help_center/collections?limit=100",
  );
  const articles = await fbRequest<FbList<Article>>(
    "GET",
    "/help_center/articles?state=all&limit=100",
  );

  writeJson(path.join(outDir, "featurebase-collections.json"), collections);
  writeJson(path.join(outDir, "featurebase-articles.json"), articles);

  const byId = new Map(collections.data.map((c) => [c.id, c.name]));
  const lines = [
    "# Featurebase Help Articles (Export)",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Total collections: ${collections.data.length}`,
    `Total articles: ${articles.data.length}`,
    "",
  ];
  for (const article of articles.data) {
    lines.push(
      `- ${article.title} | id: ${article.id} | slug: ${article.slug ?? "n/a"} | category: ${byId.get(article.parentId ?? "") ?? "n/a"} | state: ${article.state ?? "n/a"}`,
    );
  }
  writeText(path.join(outDir, "featurebase-articles.md"), `${lines.join("\n")}\n`);
  console.log(
    JSON.stringify(
      { ok: true, outDir, collections: collections.data.length, articles: articles.data.length },
      null,
      2,
    ),
  );
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

