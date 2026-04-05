import fs from "node:fs";
import path from "node:path";
import { FLAG_MANIFEST } from "../../apps/app/lib/posthog/flags-manifest";

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

type PostHogFlag = {
  key: string;
};

const root = process.cwd();
const registryPath = path.join(root, "scripts/testing/feature-flags.registry.json");

const internalToPosthogMap: Record<string, string> = {
  ai_insights: "feat_ai_intelligence_enabled",
  advanced_inventory: "feat_inventory_enabled",
};

function fail(message: string): never {
  console.error(`PostHog feature flags parity check failed: ${message}`);
  process.exit(1);
}

function loadRegistry(): Registry {
  if (!fs.existsSync(registryPath)) {
    fail("Missing internal feature flags registry");
  }
  return JSON.parse(fs.readFileSync(registryPath, "utf8")) as Registry;
}

async function fetchPostHogFlags(): Promise<Set<string>> {
  const host = process.env.POSTHOG_HOST || process.env.NEXT_PUBLIC_POSTHOG_HOST;
  const projectId = process.env.POSTHOG_PROJECT_ID;
  const personalApiKey = process.env.POSTHOG_PERSONAL_API_KEY;

  if (!host || !projectId || !personalApiKey) {
    if (process.env.CI === "true") {
      fail("POSTHOG_HOST, POSTHOG_PROJECT_ID, and POSTHOG_PERSONAL_API_KEY must be set in CI");
    }

    console.warn(
      "Skipping remote PostHog parity check outside CI because PostHog credentials are not fully configured.",
    );
    return new Set(FLAG_MANIFEST.map((flag) => flag.key));
  }

  const response = await fetch(
    `${host.replace(/\/$/, "")}/api/projects/${projectId}/feature_flags/?limit=1000`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${personalApiKey}`,
        "Content-Type": "application/json",
      },
    },
  );

  if (!response.ok) {
    fail(`Failed to fetch PostHog flags (${response.status})`);
  }

  const payload = (await response.json()) as { results?: PostHogFlag[] };
  const keys = (payload.results || []).map((flag) => flag.key).filter(Boolean);
  return new Set(keys);
}

async function main() {
  const manifestKeys = new Set(FLAG_MANIFEST.map((flag) => flag.key));
  if (manifestKeys.size !== FLAG_MANIFEST.length) {
    fail("Manifest contains duplicate flag keys");
  }

  const registry = loadRegistry();
  for (const internalFlag of registry.flags) {
    const mapped = internalToPosthogMap[internalFlag.id];
    if (!mapped) {
      fail(`Internal flag '${internalFlag.id}' is missing PostHog mapping`);
    }
    if (!manifestKeys.has(mapped)) {
      fail(`Mapped PostHog key '${mapped}' for internal flag '${internalFlag.id}' is not in manifest`);
    }
  }

  const remoteKeys = await fetchPostHogFlags();
  const missingInPostHog = [...manifestKeys].filter((key) => !remoteKeys.has(key));
  const unknownInPostHog = [...remoteKeys].filter((key) => !manifestKeys.has(key));

  if (missingInPostHog.length > 0) {
    fail(`Missing flags in PostHog: ${missingInPostHog.sort().join(", ")}`);
  }

  if (unknownInPostHog.length > 0) {
    fail(`Unknown flags in PostHog (not in manifest): ${unknownInPostHog.sort().join(", ")}`);
  }

  console.log(`PostHog flags parity check passed with ${manifestKeys.size} flags.`);
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : "Unknown error");
});
