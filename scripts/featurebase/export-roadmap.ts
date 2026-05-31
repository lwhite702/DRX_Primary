import path from "path";
import { fbRequest, type FbList, writeJson, writeText } from "./_client";

type Board = { id: string; name: string };
type Post = { id: string; title: string; boardId?: string; status?: { name?: string } };

async function main() {
  const outDir = path.resolve(
    process.cwd(),
    process.argv[2] ?? "docs/help-center-export/raw",
  );
  const boards = await fbRequest<Board[]>("GET", "/boards");
  const posts = await fbRequest<FbList<Post>>("GET", "/posts?limit=100");
  writeJson(path.join(outDir, "featurebase-boards.json"), boards);
  writeJson(path.join(outDir, "featurebase-posts.json"), posts);

  const boardById = new Map(boards.map((board) => [board.id, board.name]));
  const lines = [
    "# Featurebase Roadmap/Posts Export",
    "",
    `Generated: ${new Date().toISOString()}`,
    "",
    `Total posts: ${posts.data.length}`,
    "",
  ];
  for (const post of posts.data) {
    lines.push(
      `- ${post.title} | id: ${post.id} | board: ${boardById.get(post.boardId ?? "") ?? "n/a"} | status: ${post.status?.name ?? "n/a"}`,
    );
  }
  writeText(path.join(outDir, "featurebase-roadmap-posts.md"), `${lines.join("\n")}\n`);
  console.log(JSON.stringify({ ok: true, outDir, posts: posts.data.length }, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});

