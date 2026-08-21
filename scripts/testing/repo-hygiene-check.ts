import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { extname } from "node:path";

const SOURCE_EXTENSIONS = new Set([
  ".cjs",
  ".css",
  ".gradle",
  ".html",
  ".js",
  ".jsx",
  ".json",
  ".kt",
  ".kts",
  ".mjs",
  ".scss",
  ".sh",
  ".swift",
  ".toml",
  ".ts",
  ".tsx",
  ".yaml",
  ".yml",
]);

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

function findMergeConflictMarkers(files: string[]): string[] {
  const findings: string[] = [];

  for (const file of files) {
    if (!SOURCE_EXTENSIONS.has(extname(file))) {
      continue;
    }

    const lines = readFileSync(file, "utf8").split("\n");
    lines.forEach((line, index) => {
      if (/^(?:<<<<<<< |=======\s*$|>>>>>>> )/.test(line)) {
        findings.push(`${file}:${index + 1}`);
      }
    });
  }

  return findings;
}

function main() {
  const tracked = listTrackedFiles();
  const banned = tracked.filter((file) => file.endsWith(".DS_Store"));
  const mergeConflictMarkers = findMergeConflictMarkers(tracked);

  if (banned.length > 0) {
    console.error("❌ Repo hygiene check failed. Tracked .DS_Store is not allowed:");
    for (const file of banned) {
      console.error(`- ${file}`);
    }
    process.exit(1);
  }

  if (mergeConflictMarkers.length > 0) {
    console.error(
      "❌ Repo hygiene check failed. Unresolved merge conflict markers are not allowed:",
    );
    for (const finding of mergeConflictMarkers) {
      console.error(`- ${finding}`);
    }
    process.exit(1);
  }

  console.log(
    "✅ Repo hygiene check passed (no tracked .DS_Store files or merge conflict markers).",
  );
}

main();
