import { posthogServerFlagProvider } from "@/lib/flags/posthog-server-provider";
import type { FlagEvaluationContext, FlagValue } from "@/lib/flags/types";

export type { FlagEvaluationContext, FlagValue } from "@/lib/flags/types";

export async function getBooleanFlag(
  key: string,
  context: FlagEvaluationContext = {},
  defaultValue?: boolean,
): Promise<boolean> {
  return posthogServerFlagProvider.getBooleanFlag(key, context, defaultValue);
}

export async function ensureFlag(
  key: string,
  context: FlagEvaluationContext = {},
  defaultValue?: boolean,
): Promise<boolean> {
  return getBooleanFlag(key, context, defaultValue);
}

export async function getFlagValue<TValue extends FlagValue>(
  key: string,
  context: FlagEvaluationContext = {},
  defaultValue?: TValue,
): Promise<TValue | FlagValue> {
  return posthogServerFlagProvider.getFlagValue(key, context, defaultValue);
}
