import fs from "node:fs";
import path from "node:path";
import { FLAG_DEFAULTS, FLAG_MANIFEST } from "../../apps/app/lib/posthog/flags-manifest";
import { LEGACY_FEATURE_FLAG_MAP } from "../../apps/app/lib/posthog/legacy-feature-flags-map";

type RegistryFlag = {
  id: string;
  description: string;
  defaultGlobalEnabled: boolean;
  rollout: "global" | "staged";
};

type Registry = {
  version: string;
  flags: RegistryFlag[];
};

const root = process.cwd();
const registryPath = path.join(root, "scripts/testing/feature-flags.registry.json");
const featuresPagePath = path.join(
  root,
  "apps/app/app/(platform)/control/[consoleKey]/(console)/features/page.tsx",
);

function fail(message: string): never {
  console.error(`Feature flags parity check failed: ${message}`);
  process.exit(1);
}

/**
 * Load and validate the canonical feature-flag registry from disk.
 *
 * Exits the process with an error if the registry file is missing or contains no flags.
 *
 * @returns The parsed `Registry` object.
 */
function loadRegistry(): Registry {
  if (!fs.existsSync(registryPath)) fail("Missing canonical registry file");
  const parsed = JSON.parse(fs.readFileSync(registryPath, "utf8")) as Registry;
  if (!Array.isArray(parsed.flags) || parsed.flags.length === 0) {
    fail("Registry has no flags");
  }
  return parsed;
}

/**
 * Validates parity between the canonical feature-flag registry and PostHog legacy mappings and manifest.
 *
 * Performs these checks:
 * - Each registry flag has a legacy PostHog mapping.
 * - The mapped PostHog key exists in the feature-flag manifest.
 * - The registry `defaultGlobalEnabled` matches the manifest's default for the mapped key.
 * - Every key in the legacy mapping is present in the canonical registry.
 * - The read-only admin surface renders the canonical PostHog manifest and
 *   identifies PostHog as the sole runtime authority.
 *
 * On any failed check the process is terminated via `fail(...)`; on success a summary is logged.
 */
function main() {
  const registry = loadRegistry();
  const registryIds = new Set(registry.flags.map((flag) => flag.id));
  const manifestKeys = new Set(FLAG_MANIFEST.map((flag) => flag.key));

  for (const flag of registry.flags) {
    const mappedKey =
      LEGACY_FEATURE_FLAG_MAP[flag.id as keyof typeof LEGACY_FEATURE_FLAG_MAP];

    if (!mappedKey) {
      fail(`Registry flag '${flag.id}' is missing a PostHog legacy mapping`);
    }

    if (!manifestKeys.has(mappedKey)) {
      fail(`Mapped PostHog flag '${mappedKey}' for registry flag '${flag.id}' is missing`);
    }

    if (FLAG_DEFAULTS[mappedKey] !== flag.defaultGlobalEnabled) {
      fail(`defaultGlobalEnabled mismatch for registry flag '${flag.id}'`);
    }
  }

  for (const legacyId of Object.keys(LEGACY_FEATURE_FLAG_MAP)) {
    if (!registryIds.has(legacyId)) {
      fail(`Legacy feature flag map contains unregistered flag '${legacyId}'`);
    }
  }

  if (!fs.existsSync(featuresPagePath)) fail("Missing admin feature-flags surface");
  const featuresPage = fs.readFileSync(featuresPagePath, "utf8");
  if (!featuresPage.includes("FLAG_MANIFEST")) {
    fail("Admin feature-flags surface does not render FLAG_MANIFEST");
  }
  if (!featuresPage.includes("sole runtime authority")) {
    fail("Admin feature-flags surface does not identify the runtime authority");
  }

  console.log(
    `Feature flags parity check passed (${registry.version}) with ${registry.flags.length} legacy mappings.`,
  );
}

main();
