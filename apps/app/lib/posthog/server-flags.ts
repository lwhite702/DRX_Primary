import { FLAG_DEFAULTS } from "@/lib/posthog/flags-manifest";

type FlagEvalOptions = {
  distinctId?: string;
  personProperties?: Record<string, unknown>;
  groups?: Record<string, string>;
  defaultValue?: boolean;
};

type FlagCacheEntry = {
  value: boolean;
  expiresAt: number;
};

const cache = new Map<string, FlagCacheEntry>();
const DEFAULT_TTL_MS = 30_000;

function readOverrideMap(): Record<string, boolean> {
  const raw = process.env.POSTHOG_FLAG_OVERRIDES_JSON;
  if (!raw) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    return Object.fromEntries(
      Object.entries(parsed)
        .filter(([, value]) => typeof value === "boolean")
        .map(([key, value]) => [key, value as boolean]),
    );
  } catch {
    return {};
  }
}

function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
}

async function fetchPostHogDecide(
  distinctId: string,
  personProperties: Record<string, unknown>,
  groups: Record<string, string>,
): Promise<Record<string, unknown> | null> {
  const host =
    process.env.POSTHOG_HOST ||
    process.env.NEXT_PUBLIC_POSTHOG_HOST ||
    "https://us.i.posthog.com";
  const apiKey =
    process.env.POSTHOG_PROJECT_API_KEY || process.env.NEXT_PUBLIC_POSTHOG_KEY;

  if (!apiKey) return null;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 2_000);

  try {
    const response = await fetch(`${host.replace(/\/$/, "")}/decide/?v=3`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        api_key: apiKey,
        distinct_id: distinctId,
        person_properties: personProperties,
        groups,
      }),
      signal: controller.signal,
    });

    if (!response.ok) return null;
    return (await response.json()) as Record<string, unknown>;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}

export async function getServerFlag(
  key: string,
  options: FlagEvalOptions = {},
): Promise<boolean> {
  const fallback = options.defaultValue ?? FLAG_DEFAULTS[key] ?? false;

  const overrides = readOverrideMap();
  if (key in overrides) return overrides[key];

  const distinctId = options.distinctId || "server";
  const personProperties = options.personProperties || {};
  const groups = options.groups || {};

  const cacheKey = JSON.stringify({ key, distinctId, personProperties, groups });
  const now = Date.now();
  const cached = cache.get(cacheKey);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const decidePayload = await fetchPostHogDecide(distinctId, personProperties, groups);
  const featureFlags =
    (decidePayload?.featureFlags as Record<string, unknown> | undefined) ||
    (decidePayload?.feature_flags as Record<string, unknown> | undefined) ||
    {};

  const resolved = toBoolean(featureFlags[key]) ?? fallback;

  const ttl = Number(process.env.POSTHOG_FLAG_CACHE_TTL_MS || DEFAULT_TTL_MS);
  const safeTtl = Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TTL_MS;

  cache.set(cacheKey, {
    value: resolved,
    expiresAt: now + safeTtl,
  });

  return resolved;
}

export async function ensureServerFlag(
  key: string,
  options: FlagEvalOptions = {},
): Promise<boolean> {
  return getServerFlag(key, options);
}
