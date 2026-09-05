import fs from "fs";
import path from "path";
import { fbRequest, type FbList, writeJson } from "./_client";
import { parseCustomerChangelog, parseMode } from "./_import-content.mjs";

type Changelog = { id: string; title: string; state?: string; slug?: string };

async function listAllChangelogs(): Promise<Changelog[]> {
  const changelogs: Changelog[] = [];
  let cursor: string | null = null;
  do {
    const endpoint = `/changelogs?state=all&limit=100&locale=en${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const page = await fbRequest<FbList<Changelog>>("GET", endpoint);
    changelogs.push(...page.data);
    cursor = page.nextCursor;
  } while (cursor);
  return changelogs;
}

function versionFromTitle(title: string): string | null {
  return title.match(/\bv(\d+\.\d+\.\d+)\b/i)?.[1] ?? null;
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const source = "docs/help-center-export/changelog/customer-changelog.md";
  const sourcePath = path.resolve(process.cwd(), source);
  const reportPath = path.resolve(
    process.cwd(),
    "docs/help-center-export/reports/import-changelog-results.json",
  );
  const entries = parseCustomerChangelog(fs.readFileSync(sourcePath, "utf8"));

  if (mode.dryRun) {
    const results = entries.map((entry) => ({
      stableId: entry.stableId,
      version: entry.version,
      title: entry.title,
      action: "would-create-and-publish-or-skip-existing",
      dryRun: true,
    }));
    writeJson(reportPath, { source, mode: "dry-run", results });
    console.log(JSON.stringify({ ok: true, mode: "dry-run", source, reportPath, count: results.length }, null, 2));
    return;
  }

  const before = await listAllChangelogs();
  const existingByVersion = new Map<string, Changelog>();
  for (const entry of before) {
    const entryVersion = versionFromTitle(entry.title);
    if (entryVersion) existingByVersion.set(entryVersion, entry);
  }
  const results: Array<Record<string, string | boolean>> = [];
  const createdIds = new Set<string>();

  for (const entry of entries) {
    const match = existingByVersion.get(entry.version);
    if (match) {
      results.push({ stableId: entry.stableId, version: entry.version, title: entry.title, action: "skipped-existing", id: match.id });
      continue;
    }
    const created = await fbRequest<{ id: string }>("POST", "/changelogs", {
      title: entry.title,
      markdownContent: entry.markdownContent,
      categories: entry.categories,
      state: "draft",
    });
    await fbRequest<{ id: string; state: string }>("POST", `/changelogs/${created.id}/publish`, {
      sendEmail: false,
      locales: ["en"],
    });
    createdIds.add(created.id);
    results.push({ stableId: entry.stableId, version: entry.version, title: entry.title, action: "created+published", id: created.id });
  }

  const after = await listAllChangelogs();
  const readBack = new Map<string, Changelog>();
  for (const entry of after) readBack.set(entry.id, entry);
  for (const id of createdIds) {
    if (!readBack.has(id)) throw new Error(`Featurebase read-back did not contain created changelog ${id}.`);
  }
  writeJson(reportPath, { source, mode: "publish", readBackVerified: true, results });
  console.log(JSON.stringify({ ok: true, mode: "publish", source, reportPath, count: results.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
