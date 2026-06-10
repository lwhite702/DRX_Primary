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
