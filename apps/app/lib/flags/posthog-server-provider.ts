import { FLAG_DEFAULTS } from "@/lib/posthog/flags-manifest";
import type {
  FlagEvaluationContext,
  FlagValue,
  NormalizedFlagEvaluationContext,
  ServerFlagProvider,
} from "@/lib/flags/types";

type FlagCacheEntry = {
  value: FlagValue;
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

function toFlagValue(value: unknown): FlagValue {
  if (
    typeof value === "boolean" ||
    typeof value === "string" ||
    typeof value === "number" ||
    (typeof value === "object" && value !== null && !Array.isArray(value))
  ) {
    return value as FlagValue;
  }

  return undefined;
}

function normalizeContext(
  context: FlagEvaluationContext = {},
): NormalizedFlagEvaluationContext {
  const personProperties = {
    ...context.personProperties,
  };

  if (context.userId && personProperties.user_id === undefined) {
    personProperties.user_id = context.userId;
  }
  if (context.businessId && personProperties.business_id === undefined) {
    personProperties.business_id = context.businessId;
  }
  if (context.role && personProperties.role === undefined) {
    personProperties.role = context.role;
  }
  if (context.request?.method && personProperties.request_method === undefined) {
    personProperties.request_method = context.request.method;
  }
  if (context.request?.path && personProperties.request_path === undefined) {
    personProperties.request_path = context.request.path;
  }
  if (context.request?.userAgent && personProperties.user_agent === undefined) {
    personProperties.user_agent = context.request.userAgent;
  }

  return {
    distinctId: context.distinctId || context.userId || context.businessId || "server",
    personProperties,
    groups: context.groups || {},
  };
}

async function fetchPostHogDecide(
  context: NormalizedFlagEvaluationContext,
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
        distinct_id: context.distinctId,
        person_properties: context.personProperties,
        groups: context.groups,
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

function readFeatureFlags(decidePayload: Record<string, unknown> | null) {
  return (
    (decidePayload?.featureFlags as Record<string, unknown> | undefined) ||
    (decidePayload?.feature_flags as Record<string, unknown> | undefined) ||
    {}
  );
}

function safeTtl() {
  const ttl = Number(process.env.POSTHOG_FLAG_CACHE_TTL_MS || DEFAULT_TTL_MS);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TTL_MS;
}

function cacheKey(key: string, context: NormalizedFlagEvaluationContext) {
  return JSON.stringify({
    key,
    distinctId: context.distinctId,
    personProperties: context.personProperties,
    groups: context.groups,
  });
}

async function resolveFlagValue(
  key: string,
  context: FlagEvaluationContext,
  defaultValue: FlagValue,
): Promise<FlagValue> {
  const overrides = readOverrideMap();
  if (key in overrides) return overrides[key];

  const normalized = normalizeContext(context);
  const keyForCache = cacheKey(key, normalized);
  const now = Date.now();
  const cached = cache.get(keyForCache);
  if (cached && cached.expiresAt > now) {
    return cached.value;
  }

  const decidePayload = await fetchPostHogDecide(normalized);
  const featureFlags = readFeatureFlags(decidePayload);
  const resolved = toFlagValue(featureFlags[key]) ?? defaultValue;

  cache.set(keyForCache, {
    value: resolved,
    expiresAt: now + safeTtl(),
  });

  return resolved;
}

export const posthogServerFlagProvider: ServerFlagProvider = {
  async getBooleanFlag(
    key: string,
    context: FlagEvaluationContext = {},
    defaultValue?: boolean,
  ): Promise<boolean> {
    const fallback = defaultValue ?? context.defaultValue ?? FLAG_DEFAULTS[key] ?? false;
    const resolved = await resolveFlagValue(key, context, fallback);
    return toBoolean(resolved) ?? fallback;
  },

  async getFlagValue<TValue extends FlagValue>(
    key: string,
    context: FlagEvaluationContext = {},
    defaultValue?: TValue,
  ): Promise<TValue | FlagValue> {
    const fallback = defaultValue ?? FLAG_DEFAULTS[key];
    return resolveFlagValue(key, context, fallback);
  },
};

export function clearPostHogFlagCache() {
  cache.clear();
}
