import {
  ensureFlag,
  getBooleanFlag,
  type FlagEvaluationContext,
} from "@/lib/flags/server";

/**
 * Retrieve the boolean value of a server-side feature flag.
 *
 * @param key - The feature flag key to evaluate.
 * @param options - Evaluation context for the flag; if `options.defaultValue` is present it will be used as the fallback.
 * @returns `true` if the flag is enabled for the given context, `false` otherwise.
 */
export async function getServerFlag(
  key: string,
  options: FlagEvaluationContext = {},
): Promise<boolean> {
  return getBooleanFlag(key, options, options.defaultValue);
}

/**
 * Ensures a server-side feature flag is evaluated and returns its boolean value.
 *
 * @param key - The feature flag key to evaluate
 * @param options - Additional evaluation context; `options.defaultValue` will be used if the flag cannot be resolved
 * @returns `true` if the flag is enabled for the given key and context, `false` otherwise
 */
export async function ensureServerFlag(
  key: string,
  options: FlagEvaluationContext = {},
): Promise<boolean> {
  return ensureFlag(key, options, options.defaultValue);
}
