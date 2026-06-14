"use client";

import { useFlag, useFlagValue } from "@/lib/flags/client";

/**
 * Provides a feature-flag hook backed by the internal OpenFeature-compatible flag boundary.
 *
 * Flag naming convention:
 * - feat_<module>_<capability> - Feature rollout control
 * - beta_<surface>_<cohort> - Beta user access gating
 * - exp_<domain>_<hypothesis> - A/B testing experiments
 * - ops_<route>_kill_switch - Kill switches, maintenance mode
 * - test_<surface>_<purpose> - Test-only gates
 *
 * @param featureKey - The feature flag key (use the project's naming convention above)
 * @returns The feature flag state, typically an object containing the flag's enabled value and a loading indicator
 */
export function useFeatureFlag(featureKey: string) {
  return useFlag(featureKey, false);
}

/**
 * Retrieves the current value and loading state for a multivariate feature flag.
 *
 * @param featureKey - The feature flag key to read.
 * @returns The flag's evaluated `value` (`string`, `boolean`, or `undefined`) and a `loading` boolean indicating whether the value is still being resolved.
 */
export function useFeatureFlagValue(featureKey: string) {
  return useFlagValue(featureKey);
}
