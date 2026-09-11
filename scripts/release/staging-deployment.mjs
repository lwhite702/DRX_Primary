import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

export function validateSource(event, repository, currentSha, checkoutSha) {
  const run = event.workflow_run;
  if (run?.name !== "CI Gate" || run.conclusion !== "success" ||
      run.event !== "push" || run.head_branch !== "staging" ||
      !repository || run.head_repository?.full_name !== repository ||
      !/^[a-f0-9]{40}$/.test(run.head_sha ?? "")) {
    throw new Error("Staging deployment requires successful same-repository staging push CI.");
  }
  if (run.head_sha !== currentSha || run.head_sha !== checkoutSha) {
    throw new Error("Tested commit is superseded or does not match the checkout; refusing deployment.");
  }
}

export function validateConfiguration(env) {
  for (const key of ["CONVEX_DEPLOY_KEY_STAGING", "VERCEL_TOKEN_STAGING",
    "VERCEL_ORG_ID_STAGING", "VERCEL_PROJECT_ID_STAGING", "VERCEL_SCOPE_STAGING"]) {
    if (!env[key]?.trim()) throw new Error(`Missing dedicated staging configuration: ${key}`);
  }
}

export function validateHealth(raw) {
  let health;
  try { health = JSON.parse(raw); } catch { throw new Error("Staging health returned invalid JSON."); }
  if (health?.status !== "healthy" || health?.checks?.database !== true) {
    throw new Error("Staging health did not report a healthy database.");
  }
}

function checkHead() {
  const repository = process.env.GITHUB_REPOSITORY;
  if (!/^[\w.-]+\/[\w.-]+$/.test(repository ?? "")) throw new Error("Missing valid repository.");
  const event = JSON.parse(readFileSync(process.env.GITHUB_EVENT_PATH, "utf8"));
  const currentSha = execFileSync("gh", ["api", `repos/${repository}/git/ref/heads/staging`,
    "--jq", ".object.sha"], { encoding: "utf8" }).trim();
  const checkoutSha = execFileSync("git", ["rev-parse", "HEAD"], { encoding: "utf8" }).trim();
  validateSource(event, repository, currentSha, checkoutSha);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  try {
    switch (process.argv[2]) {
      case "preflight": validateConfiguration(process.env); checkHead(); break;
      case "head": checkHead(); break;
      case "health": validateHealth(process.env.HEALTH_RESPONSE); break;
      default: throw new Error("Expected preflight, head, or health.");
    }
    console.log("Staging deployment validation passed.");
  } catch (error) {
    console.error(error.message);
    process.exitCode = 1;
  }
}
