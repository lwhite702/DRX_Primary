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

/**
 * Reads boolean flag overrides from the `POSTHOG_FLAG_OVERRIDES_JSON` environment variable.
 *
 * Parses the environment variable as JSON and returns an object containing only entries whose values are booleans.
 *
 * @returns A mapping of flag keys to boolean override values; returns an empty object if the environment variable is missing, cannot be parsed as JSON, or contains no boolean-valued entries.
 */
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

/**
 * Convert the given value to a boolean when it is already a boolean or a string equal to "true"/"false" (case-insensitive).
 *
 * @param value - The value to convert; accepted inputs are booleans or strings like `"true"`/`"false"`.
 * @returns `true` if the input is boolean `true` or the string `"true"` (case-insensitive), `false` if the input is boolean `false` or the string `"false"` (case-insensitive), `undefined` otherwise.
 */
function toBoolean(value: unknown): boolean | undefined {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    if (value.toLowerCase() === "true") return true;
    if (value.toLowerCase() === "false") return false;
  }
  return undefined;
}

/**
 * Coerces a raw input into a FlagValue when it is an accepted primitive or object type.
 *
 * @param value - The value to coerce; accepted types are `boolean`, `string`, `number`, or a non-null, non-array object.
 * @returns The input as a `FlagValue` when it matches an accepted type, `undefined` otherwise.
 */
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

/**
 * Normalize a flag evaluation context into a PostHog-compatible structure.
 *
 * @param context - Input evaluation context. If top-level fields like `userId`, `businessId`, `role`, or `request.{method,path,userAgent}` are present and the corresponding keys are not already set in `personProperties`, they will be copied into `personProperties` as `user_id`, `business_id`, `role`, `request_method`, `request_path`, and `user_agent` respectively.
 * @returns An object with:
 *  - `distinctId`: the primary identifier chosen from `context.distinctId`, `context.userId`, `context.businessId`, or `"server"`;
 *  - `personProperties`: a new object containing the merged person properties;
 *  - `groups`: the provided `context.groups` or an empty object.
 */
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

/**
 * Fetches a PostHog /decide response for the given normalized evaluation context.
 *
 * @param context - Normalized flag evaluation context containing `distinctId`, `personProperties`, and `groups` used by PostHog's decide API
 * @returns The parsed JSON response from PostHog as a record, or `null` if the API key is missing, the request fails, times out, or returns a non-OK status
 */
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

/**
 * Extracts feature flags object from a PostHog decide payload.
 *
 * @param decidePayload - The response returned by PostHog's `/decide` endpoint.
 * @returns The feature flags mapping from the payload (`featureFlags` or `feature_flags`), or an empty object if not present.
 */
function readFeatureFlags(decidePayload: Record<string, unknown> | null) {
  return (
    (decidePayload?.featureFlags as Record<string, unknown> | undefined) ||
    (decidePayload?.feature_flags as Record<string, unknown> | undefined) ||
    {}
  );
}

/**
 * Computes a safe cache TTL for feature flags based on environment configuration.
 *
 * @returns The cache TTL in milliseconds from `POSTHOG_FLAG_CACHE_TTL_MS` when it parses to a finite number greater than 0; otherwise `DEFAULT_TTL_MS`.
 */
function safeTtl() {
  const ttl = Number(process.env.POSTHOG_FLAG_CACHE_TTL_MS || DEFAULT_TTL_MS);
  return Number.isFinite(ttl) && ttl > 0 ? ttl : DEFAULT_TTL_MS;
}

/**
 * Create a deterministic cache key for a flag evaluation.
 *
 * @param key - The feature flag identifier
 * @param context - Normalized evaluation context whose `distinctId`, `personProperties`, and `groups` are included in the key
 * @returns A JSON string combining the `key`, `distinctId`, `personProperties`, and `groups` suitable for use as a cache key
 */
function cacheKey(key: string, context: NormalizedFlagEvaluationContext) {
  return JSON.stringify({
    key,
    distinctId: context.distinctId,
    personProperties: context.personProperties,
    groups: context.groups,
  });
}

/**
 * Resolve the feature flag value for a key within the provided evaluation context.
 *
 * @param key - The feature flag key to resolve
 * @param context - The evaluation context (user, groups, and person properties) used when resolving the flag
 * @param defaultValue - Fallback value to use if the flag cannot be resolved to a valid `FlagValue`
 * @returns The resolved `FlagValue` for `key`; if no valid value is available, returns `defaultValue`
 */
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

/**
 * Clears the in-memory cache of resolved PostHog flag values.
 *
 * Removes all cached flag entries so subsequent flag resolutions will fetch fresh values.
 */
export function clearPostHogFlagCache() {
  cache.clear();
}
