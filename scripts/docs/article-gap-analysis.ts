import fs from "fs";
import path from "path";

function listMdTitles(dirPath: string): string[] {
  if (!fs.existsSync(dirPath)) return [];
  return fs
    .readdirSync(dirPath)
    .filter((file) => file.endsWith(".md"))
    .map((file) => {
      const content = fs.readFileSync(path.join(dirPath, file), "utf8");
      const title = content
        .split("\n")
        .find((line) => line.startsWith("# "))
        ?.replace(/^#\s+/, "")
        .trim();
      return title ?? file;
    });
}

async function main() {
  const rawTitles = listMdTitles(
    path.resolve(process.cwd(), "docs/help-center-export/raw"),
  );
  const finalTitles = listMdTitles(
    path.resolve(process.cwd(), "docs/help-center-export/final"),
  );
  const reportPath = path.resolve(
    process.cwd(),
    "docs/help-center-export/reports/drx-help-center-gap-analysis-auto.md",
  );

  const finalSet = new Set(finalTitles);
  const rawOnly = rawTitles.filter((title) => !finalSet.has(title));
  const lines = [
    "# DRX Gap Analysis (Auto)",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Raw docs count: ${rawTitles.length}`,
    `Final docs count: ${finalTitles.length}`,
    "",
    "## Potential raw-only topics",
    ...(rawOnly.length > 0 ? rawOnly.map((title) => `- ${title}`) : ["- none"]),
  ];
  fs.writeFileSync(reportPath, `${lines.join("\n")}\n`, "utf8");
  console.log(JSON.stringify({ ok: true, reportPath, rawOnly: rawOnly.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

