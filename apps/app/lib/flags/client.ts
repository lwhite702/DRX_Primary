"use client";

import { useCallback, useEffect, useState } from "react";
import { useBusiness } from "@/lib/hooks/use-business";
import {
  isFeatureEnabled,
  getFeatureFlag,
  onFeatureFlags,
  reloadFeatureFlags,
} from "@wrelik/analytics/client";
import type { FlagValue } from "@/lib/flags/types";

/**
 * Tracks whether a feature flag is enabled and exposes an initial loading state.
 *
 * @param featureKey - The feature flag key to check
 * @param defaultValue - Value to use until the flag is resolved
 * @returns An object with `isEnabled` set to `true` if the feature flag is enabled, `false` otherwise, and `loading` set to `true` while the initial flag check is in progress
 */
export function useFlag(featureKey: string, defaultValue = false) {
  const { business } = useBusiness();
  const [isEnabled, setIsEnabled] = useState<boolean>(defaultValue);
  const [loading, setLoading] = useState(true);

  const checkFeature = useCallback(() => {
    const enabled = isFeatureEnabled(featureKey, defaultValue);
    setIsEnabled(enabled);
    setLoading(false);
  }, [defaultValue, featureKey]);

  useEffect(() => {
    checkFeature();

    onFeatureFlags(() => {
      checkFeature();
    });

    if (business?.id) {
      reloadFeatureFlags();
    }
  }, [business?.id, checkFeature]);

  return { isEnabled, loading };
}

/**
 * Exposes the current value of a feature flag and whether the initial value is still loading.
 *
 * @param featureKey - The identifier of the feature flag to read.
 * @param defaultValue - Fallback value used when the flag is unset or not yet available.
 * @returns An object with `value` (the current flag value or `defaultValue`) and `loading` (`true` while the initial value is being resolved, `false` afterwards).
 */
export function useFlagValue<TValue extends FlagValue = string | boolean | undefined>(
  featureKey: string,
  defaultValue?: TValue,
) {
  const [value, setValue] = useState<TValue | FlagValue>(defaultValue);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const currentValue = getFeatureFlag(featureKey) ?? defaultValue;
    setValue(currentValue);
    setLoading(false);

    onFeatureFlags(() => {
      setValue(getFeatureFlag(featureKey) ?? defaultValue);
    });
  }, [defaultValue, featureKey]);

  return { value, loading };
}
