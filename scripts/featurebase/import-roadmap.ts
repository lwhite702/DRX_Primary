import fs from "fs";
import path from "path";
import { fbRequest, type FbList, writeJson } from "./_client";
import { parseMode, parseRoadmap, stableId } from "./_import-content.mjs";

type Board = { id: string; name: string };
type Post = { id: string; title: string; content?: string; slug?: string };

function roadmapIdentity(title: string): string {
  return `roadmap-${stableId(title.replace(/^(Now|Next|Later):\s*/i, ""))}`;
}

async function listAllPosts(): Promise<Post[]> {
  const posts: Post[] = [];
  let cursor: string | null = null;
  do {
    const endpoint = `/posts?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`;
    const page = await fbRequest<FbList<Post>>("GET", endpoint);
    posts.push(...page.data);
    cursor = page.nextCursor;
  } while (cursor);
  return posts;
}

async function main() {
  const mode = parseMode(process.argv.slice(2));
  const source = "docs/help-center-export/roadmap/customer-roadmap.md";
  const sourcePath = path.resolve(process.cwd(), source);
  const reportPath = path.resolve(
    process.cwd(),
    "docs/help-center-export/reports/import-roadmap-results.json",
  );
  const items = parseRoadmap(fs.readFileSync(sourcePath, "utf8"));

  if (mode.dryRun) {
    const results = items.map((item) => ({
      stableId: item.stableId,
      title: item.title,
      action: "would-create-or-skip-existing",
      dryRun: true,
    }));
    writeJson(reportPath, { source, mode: "dry-run", results });
    console.log(JSON.stringify({ ok: true, mode: "dry-run", source, reportPath, count: results.length }, null, 2));
    return;
  }

  const boards = await fbRequest<Board[]>("GET", "/boards");
  const board = boards.find((candidate) => candidate.name === "Feature Request");
  if (!board) throw new Error("Feature Request board not found.");

  const before = await listAllPosts();
  const existing = new Map<string, Post>();
  for (const post of before) existing.set(roadmapIdentity(post.title), post);
  const results: Array<Record<string, string | boolean>> = [];
  const createdIds = new Set<string>();

  for (const item of items) {
    const match = existing.get(item.stableId);
    if (match) {
      const unchanged = match.title === item.title && (!match.content || match.content.trim() === item.content.trim());
      results.push({
        stableId: item.stableId,
        title: item.title,
        action: unchanged ? "skipped-existing" : "skipped-existing-manual-update-required",
        id: match.id,
      });
      continue;
    }
    const created = await fbRequest<{ id: string }>("POST", "/posts", {
      title: item.title,
      content: item.content,
      boardId: board.id,
      tags: ["roadmap", item.section, item.state],
      visibility: "public",
    });
    createdIds.add(created.id);
    results.push({ stableId: item.stableId, title: item.title, action: "created", id: created.id });
  }

  const after = await listAllPosts();
  const readBackIds = new Set(after.map((post) => post.id));
  for (const id of createdIds) {
    if (!readBackIds.has(id)) throw new Error(`Featurebase read-back did not contain created roadmap post ${id}.`);
  }
  writeJson(reportPath, { source, mode: "publish", readBackVerified: true, results });
  console.log(JSON.stringify({ ok: true, mode: "publish", source, reportPath, count: results.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
