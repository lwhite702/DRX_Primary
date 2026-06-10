import {
  ensureFlag,
  getBooleanFlag,
  type FlagEvaluationContext,
} from "@/lib/flags/server";

export async function getServerFlag(
  key: string,
  options: FlagEvaluationContext = {},
): Promise<boolean> {
  return getBooleanFlag(key, options, options.defaultValue);
}

export async function ensureServerFlag(
  key: string,
  options: FlagEvaluationContext = {},
): Promise<boolean> {
  return ensureFlag(key, options, options.defaultValue);
}
