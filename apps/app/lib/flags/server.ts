import { posthogServerFlagProvider } from "@/lib/flags/posthog-server-provider";
import type { FlagEvaluationContext, FlagValue } from "@/lib/flags/types";

export type { FlagEvaluationContext, FlagValue } from "@/lib/flags/types";

/**
 * Retrieve a boolean feature flag for the given key and evaluation context.
 *
 * @param key - The feature flag key to evaluate
 * @param context - Optional evaluation context used when resolving the flag
 * @param defaultValue - Optional value to use if the provider does not return a value for `key`
 * @returns `true` if the flag evaluates to enabled for `context`, `false` otherwise; uses `defaultValue` when the provider does not return a value
 */
export async function getBooleanFlag(
  key: string,
  context: FlagEvaluationContext = {},
  defaultValue?: boolean,
): Promise<boolean> {
  return posthogServerFlagProvider.getBooleanFlag(key, context, defaultValue);
}

/**
 * Retrieve a boolean feature flag value for the given key, using the provided evaluation context and fallback.
 *
 * @param key - The flag key to evaluate
 * @param context - Evaluation context (attributes used when evaluating the flag)
 * @param defaultValue - Fallback value used if the flag is not set
 * @returns `true` if the flag is enabled for the evaluated context, `false` otherwise.
 */
export async function ensureFlag(
  key: string,
  context: FlagEvaluationContext = {},
  defaultValue?: boolean,
): Promise<boolean> {
  return getBooleanFlag(key, context, defaultValue);
}

/**
 * Fetches a feature flag value for the given key, using the provided context and fallbacks.
 *
 * @param context - Additional attributes used to evaluate the flag (identity, properties, etc.)
 * @param defaultValue - Fallback value whose type is used to type the returned value when provided
 * @returns The evaluated flag value; when `defaultValue` is supplied, a value of the same type as `defaultValue`, otherwise a `FlagValue`
 */
export async function getFlagValue<TValue extends FlagValue>(
  key: string,
  context: FlagEvaluationContext = {},
  defaultValue?: TValue,
): Promise<TValue | FlagValue> {
  return posthogServerFlagProvider.getFlagValue(key, context, defaultValue);
}
