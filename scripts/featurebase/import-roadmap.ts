import path from "path";
import { fbRequest, writeJson } from "./_client";

type Board = { id: string; name: string };

const items = [
  {
    title: "Now: Quick POS flow hardening",
    content: "In progress: cleaner state transitions and fewer checkout interruptions.",
    tags: ["roadmap", "now", "in-progress"],
  },
  {
    title: "Next: Reporting and insights depth",
    content: "Planned: clearer manager-facing insight layers and easier operational readouts.",
    tags: ["roadmap", "next", "planned"],
  },
  {
    title: "Later: Extended privacy automation",
    content: "Under review: stronger lifecycle tooling for sensitive-data workflows.",
    tags: ["roadmap", "later", "under-review"],
  },
];

async function main() {
  const dryRun = process.argv.includes("--dry-run");
  const reportPath = path.resolve(
    process.cwd(),
    "docs/help-center-export/reports/import-roadmap-results.json",
  );

  const boards = await fbRequest<Board[]>("GET", "/boards");
  const board = boards.find((candidate) => candidate.name === "Feature Request");
  if (!board) {
    throw new Error("Feature Request board not found.");
  }

  const results: Array<Record<string, string | boolean>> = [];
  for (const item of items) {
    if (dryRun) {
      results.push({ title: item.title, action: "would-create", boardId: board.id, dryRun: true });
      continue;
    }
    const created = await fbRequest<{ id: string }>("POST", "/posts", {
      title: item.title,
      content: item.content,
      boardId: board.id,
      tags: item.tags,
      visibility: "public",
    });
    results.push({ title: item.title, action: "created", id: created.id, boardId: board.id });
  }

  writeJson(reportPath, results);
  console.log(JSON.stringify({ ok: true, dryRun, reportPath, count: results.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

