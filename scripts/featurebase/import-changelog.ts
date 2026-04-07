import { fbRequest, writeJson } from "./_client";
import path from "path";

type ChangelogSeed = {
  title: string;
  markdownContent: string;
  categories: string[];
};

const seed: ChangelogSeed[] = [
  {
    title: "v0.5.4: Help Center and POS Flow Quality Updates",
    markdownContent:
      "We tightened Quick POS reliability, improved in-app help coverage, and cleaned up key operator workflow behavior.",
    categories: ["New", "Improved"],
  },
  {
    title: "v0.5.3: Route Guard and Operations Stability Improvements",
    markdownContent:
      "Auth/route guard behavior is more consistent, and daily operator navigation is smoother across core pages.",
    categories: ["Improved", "Fixed"],
  },
  {
    title: "v0.5.0: Major DRX App Surface Milestone",
    markdownContent:
      "Expanded operational coverage across dashboard, sales, inventory, and reporting foundations.",
    categories: ["New"],
  },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const reportPath = path.resolve(
    process.cwd(),
    "docs/help-center-export/reports/import-changelog-results.json",
  );
  const results: Array<Record<string, string | boolean>> = [];

  for (const entry of seed) {
    if (dryRun) {
      results.push({ title: entry.title, action: "would-create-and-publish", dryRun: true });
      continue;
    }

    const created = await fbRequest<{ id: string }>("POST", "/changelogs", {
      ...entry,
      state: "draft",
    });
    const published = await fbRequest<{ id: string; state: string }>(
      "POST",
      `/changelogs/${created.id}/publish`,
      { sendEmail: false, locales: ["en"] },
    );
    results.push({ title: entry.title, action: "created+published", id: created.id, state: published.state });
  }

  writeJson(reportPath, results);
  console.log(JSON.stringify({ ok: true, dryRun, reportPath, count: results.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

