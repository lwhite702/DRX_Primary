import path from "path";
import { fbRequest, type FbList, writeJson, writeText } from "./_client";

type Changelog = {
  id: string;
  title: string;
  slug?: string;
  state?: string;
  url?: string;
  date?: string;
};

async function main() {
  const outDir = path.resolve(
    process.cwd(),
    process.argv[2] ?? "docs/help-center-export/raw",
  );
  const changelogs = await fbRequest<FbList<Changelog>>(
    "GET",
    "/changelogs?state=all&limit=100&locale=en",
  );

  writeJson(path.join(outDir, "featurebase-changelogs.json"), changelogs);
  const lines = [
    "# Featurebase Changelog Export",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Total: ${changelogs.data.length}`,
    "",
    ...changelogs.data.map(
      (c) =>
        `- ${c.title} | id: ${c.id} | slug: ${c.slug ?? "n/a"} | state: ${c.state ?? "n/a"} | date: ${c.date ?? "n/a"}`,
    ),
  ];
  writeText(path.join(outDir, "featurebase-changelogs.md"), `${lines.join("\n")}\n`);
  console.log(JSON.stringify({ ok: true, count: changelogs.data.length, outDir }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

