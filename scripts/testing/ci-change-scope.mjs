import { execFileSync } from "node:child_process";
import { appendFileSync, readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

// Only ordinary prose is exempt. MDX, assets, config, scripts, and unknown
// paths still run every runtime gate. Check both sides of renames via no-renames.
export function isDocumentationOnly(files) {
  return files.length > 0 && files.every((file) =>
    /^(?:[^/]+\.md|(?:docs|app-docs|\.agents|\.claude|\.github\/PULL_REQUEST_TEMPLATE)\/.+\.md)$/.test(file),
  );
}

export function classifyChange(eventName, event, git = (args) =>
  execFileSync("git", args, { encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })) {
  // Pushes and manual runs always validate the full integrated tree. Only a
  // complete PR diff can qualify for the prose-only fast path.
  if (eventName !== "pull_request") return "runtime";
  const base = event?.pull_request?.base?.sha;
  const head = event?.pull_request?.head?.sha;
  if (![base, head].every((sha) => /^[0-9a-f]{40}$/.test(sha ?? ""))) return "runtime";
  try {
    const output = git(["diff", "--name-only", "--no-renames", "-z", `${base}...${head}`, "--"]);
    return isDocumentationOnly(output.split("\0").filter(Boolean)) ? "docs" : "runtime";
  } catch {
    // Missing history or a failed diff must never silently skip tests.
    return "runtime";
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  let event = {};
  try { event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8")); } catch {}
  const scope = classifyChange(process.env.GITHUB_EVENT_NAME, event);
  const runtime = scope === "runtime";
  console.log(`CI scope: ${scope}; runtime checks required: ${runtime}`);
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `scope=${scope}\nruntime=${runtime}\n`);
}
