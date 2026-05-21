import fs from "node:fs/promises";
import path from "node:path";

const projectRoot = path.resolve(process.cwd());
const manifestPath = path.join(projectRoot, "lib/posthog/flags-manifest.ts");
const legacyMapPath = path.join(projectRoot, "lib/posthog/legacy-feature-flags-map.ts");

const namespacePattern = /^(feat|exp|beta|test|ops)_[a-z0-9_]+$/;

function extractKeysFromTs(source) {
  const matches = source.matchAll(/key:\s*"([^"]+)"/g);
  return [...matches].map((match) => match[1]);
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

  const duplicates = keys.filter((key, index) => keys.indexOf(key) !== index);
  if (duplicates.length > 0) {
    throw new Error(`Duplicate PostHog flag keys found: ${[...new Set(duplicates)].join(", ")}`);
  }

  const invalidNamespace = keys.filter((key) => !namespacePattern.test(key));
  if (invalidNamespace.length > 0) {
    throw new Error(
      `Invalid flag namespace format: ${invalidNamespace.join(", ")}. Expected feat_/exp_/beta_/test_/ops_.`,
    );
  }

  const legacyTargets = extractMappedTargetsFromTs(legacyMapSource);
  const missingLegacyTargets = legacyTargets.filter((target) => !keys.includes(target));
  if (missingLegacyTargets.length > 0) {
    throw new Error(
      `Legacy feature flag map references unknown manifest flags: ${missingLegacyTargets.join(", ")}`,
    );
  }

  console.log(`PostHog manifest validation passed (${keys.length} flags).`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
