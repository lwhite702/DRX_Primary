import { spawnSync } from "node:child_process";

function listTrackedFiles(): string[] {
  const proc = spawnSync("git", ["ls-files"], {
    cwd: process.cwd(),
    encoding: "utf8",
  });

  if (proc.status !== 0) {
    const stderr = (proc.stderr ?? "").trim();
    throw new Error(`Failed to list tracked files. ${stderr}`);
  }

  return (proc.stdout ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
}

function main() {
  const tracked = listTrackedFiles();
  const banned = tracked.filter((file) => file.endsWith(".DS_Store"));

  if (banned.length > 0) {
    console.error("❌ Repo hygiene check failed. Tracked .DS_Store is not allowed:");
    for (const file of banned) {
      console.error(`- ${file}`);
    }
    process.exit(1);
  }

  console.log("✅ Repo hygiene check passed (no tracked .DS_Store files).");
}

main();
