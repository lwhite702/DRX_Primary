import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());
const manifestPath = path.resolve(projectRoot, "../../packages/wrelik-analytics/src/flags.ts");
const legacyMapPath = path.join(projectRoot, "lib/posthog/legacy-feature-flags-map.ts");

const namespacePattern = /^(feat|exp|test|ops)_[a-z0-9_]+$/;

function extractKeysFromTs(source) {
  const matches = source.matchAll(/key:\s*"([^"]+)"/g);
  return [...new Set([...matches].map((match) => match[1]))];
}

function extractMappedTargetsFromTs(source) {
  const matches = source.matchAll(/:\s*"([^"]+)"/g);
  return [...matches].map((match) => match[1]);
}

async function main() {
  const [manifestSource, legacyMapSource] = await Promise.all([
    fs.readFile(manifestPath, "utf8"),
    fs.readFile(legacyMapPath, "utf8"),
  ]);

  const keys = extractKeysFromTs(manifestSource);
  if (keys.length === 0) {
    throw new Error("No PostHog flags found in manifest.");
  }

  const invalidNamespace = keys.filter((key) => !namespacePattern.test(key));
  if (invalidNamespace.length > 0) {
    throw new Error(
      `Invalid flag namespace format: ${invalidNamespace.join(", ")}. Expected feat_/exp_/test_/ops_.`,
    );
  }

  const legacyTargets = extractMappedTargetsFromTs(legacyMapSource);
  const missingLegacyTargets = legacyTargets.filter((target) => !keys.includes(target));
  if (missingLegacyTargets.length > 0) {
    throw new Error(
      `Legacy feature flag map references unknown manifest flags: ${missingLegacyTargets.join(", ")}`,
    );
  }

  if (process.env.POSTHOG_PERSONAL_API_KEY) {
    const host = (process.env.POSTHOG_HOST || "https://us.posthog.com").replace(/\/$/, "");
    const project = process.env.POSTHOG_PROJECT_ID || "303889";
    const response = await fetch(`${host}/api/projects/${project}/feature_flags/?limit=200`, {
      headers: { Authorization: `Bearer ${process.env.POSTHOG_PERSONAL_API_KEY}` },
    });
    if (!response.ok) throw new Error(`PostHog parity request failed (${response.status})`);
    const remote = new Set((await response.json()).results.map((flag) => flag.key));
    const missingRemote = keys.filter((key) => !remote.has(key));
    if (missingRemote.length > 0) throw new Error(`Manifest flags missing from PostHog: ${missingRemote.join(", ")}`);
  }

  console.log(`PostHog manifest validation passed (${keys.length} flags).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
