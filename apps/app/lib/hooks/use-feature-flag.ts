"use client";

import { useFlag, useFlagValue } from "@/lib/flags/client";

/**
 * Feature flag hook using the internal OpenFeature-compatible flag boundary.
 * 
 * Flag naming convention:
 * - feat_<module>_<capability> - Feature rollout control
 * - beta_<surface>_<cohort> - Beta user access gating
 * - exp_<domain>_<hypothesis> - A/B testing experiments
 * - ops_<route>_kill_switch - Kill switches, maintenance mode
 * - test_<surface>_<purpose> - Test-only gates
 */
export function useFeatureFlag(featureKey: string) {
  return useFlag(featureKey, false);
}

/**
 * Get feature flag value (for multivariate flags)
 */
export function useFeatureFlagValue(featureKey: string) {
  return useFlagValue(featureKey);
}
