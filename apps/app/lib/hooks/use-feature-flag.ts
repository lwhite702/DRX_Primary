"use client";

import { useEffect, useState, useCallback } from "react";
import { useBusiness } from "@/lib/hooks/use-business";
import {
  isFeatureEnabled,
  getFeatureFlag,
  onFeatureFlags,
  reloadFeatureFlags,
} from "@wrelik/analytics/client";

/**
 * Feature flag hook using PostHog via @wrelik/analytics
 * 
 * Flag naming convention:
 * - release.{domain}.{feature} - Feature rollout control
 * - beta.{domain}.{feature} - Beta user access gating
 * - exp.{domain}.{feature} - A/B testing experiments
 * - ops.{domain}.{feature} - Kill switches, maintenance mode
 * - ui.{domain}.{feature} - UI variant control
 */
export function useFeatureFlag(featureKey: string) {
  const { business } = useBusiness();
  const [isEnabled, setIsEnabled] = useState<boolean>(false);
  const [loading, setLoading] = useState(true);

  const checkFeature = useCallback(() => {
    // Check PostHog feature flag
    const enabled = isFeatureEnabled(featureKey, false);
    setIsEnabled(enabled);
    setLoading(false);
  }, [featureKey]);

  useEffect(() => {
    // Initial check
    checkFeature();

    // Subscribe to feature flag changes
    onFeatureFlags(() => {
      checkFeature();
    });

    // Reload flags when business context changes
    if (business?.id) {
      reloadFeatureFlags();
    }
  }, [business?.id, featureKey, checkFeature]);

  return { isEnabled, loading };
}

/**
 * Get feature flag value (for multivariate flags)
 */
export function useFeatureFlagValue(featureKey: string) {
  const [value, setValue] = useState<string | boolean | undefined>(undefined);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const flagValue = getFeatureFlag(featureKey);
    setValue(flagValue);
    setLoading(false);

    onFeatureFlags(() => {
      setValue(getFeatureFlag(featureKey));
    });
  }, [featureKey]);

  return { value, loading };
}
