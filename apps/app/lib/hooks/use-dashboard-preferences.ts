"use client";

import { useCallback, useEffect, useState } from "react";
import { useIsBypassActive } from "@/lib/adapters/auth/ui";
import {
  DASHBOARD_PREFS_LOCAL_STORAGE_KEY,
  extractDashboardPreferencesFromMetadata,
  getDefaultDashboardPreferences,
  mergeDashboardPreferences,
  type DashboardPreferences,
  type DashboardViewPreset,
  type PinnedPanelItemId,
} from "@/lib/auth/dashboard-preferences";
import {
  getDashboardPreferencesAction,
  updateDashboardPreferencesAction,
} from "@/app/actions/dashboard-preferences";

const DASHBOARD_PREFS_EVENT = "drx:dashboard-preferences-updated";

type DashboardPreferencesPatch = Partial<
  Pick<DashboardPreferences, "preset" | "pinnedItemIds">
>;

function readPrefsFromLocalStorage(): DashboardPreferences | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DASHBOARD_PREFS_LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return extractDashboardPreferencesFromMetadata(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writePrefsToLocalStorage(preferences: DashboardPreferences) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(
    DASHBOARD_PREFS_LOCAL_STORAGE_KEY,
    JSON.stringify(preferences),
  );
  window.dispatchEvent(new CustomEvent(DASHBOARD_PREFS_EVENT, { detail: preferences }));
}

export function useDashboardPreferences() {
  const authBypassEnabled = useIsBypassActive();

  const [preferences, setPreferences] = useState<DashboardPreferences>(() =>
    getDefaultDashboardPreferences(),
  );
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const localPrefs = readPrefsFromLocalStorage();
    setPreferences(localPrefs ?? getDefaultDashboardPreferences());

    if (authBypassEnabled) {
      return;
    }

    let cancelled = false;

    void (async () => {
      try {
        const result = await getDashboardPreferencesAction();
        if (!cancelled && result.success) {
          setPreferences(result.preferences);
          writePrefsToLocalStorage(result.preferences);
        }
      } catch (error) {
        console.warn("Failed to load server dashboard preferences:", error);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [authBypassEnabled]);

  useEffect(() => {
    const onPrefsUpdated = (event: Event) => {
      const custom = event as CustomEvent<DashboardPreferences>;
      if (custom.detail) {
        setPreferences(custom.detail);
      } else {
        const fromLocal = readPrefsFromLocalStorage();
        if (fromLocal) setPreferences(fromLocal);
      }
    };

    window.addEventListener(DASHBOARD_PREFS_EVENT, onPrefsUpdated as EventListener);
    return () =>
      window.removeEventListener(DASHBOARD_PREFS_EVENT, onPrefsUpdated as EventListener);
  }, []);

  const patchPreferences = useCallback(
    async (
      patch: DashboardPreferencesPatch,
    ) => {
      const optimistic = mergeDashboardPreferences(preferences, patch);
      setPreferences(optimistic);
      writePrefsToLocalStorage(optimistic);

      if (authBypassEnabled) {
        return optimistic;
      }

      setSaving(true);
      try {
        const result = await updateDashboardPreferencesAction(patch);
        if (!result.success) {
          throw new Error(result.error);
        }
        setPreferences(result.preferences);
        writePrefsToLocalStorage(result.preferences);
        return result.preferences;
      } catch (error) {
        console.error("Failed to persist dashboard preferences:", error);
        // Keep optimistic local state so the UI remains usable even if persistence fails.
        return optimistic;
      } finally {
        setSaving(false);
      }
    },
    [authBypassEnabled, preferences],
  );

  const setPreset = useCallback(
    (preset: DashboardViewPreset) => patchPreferences({ preset }),
    [patchPreferences],
  );

  const setPinnedItemIds = useCallback(
    (pinnedItemIds: PinnedPanelItemId[]) => patchPreferences({ pinnedItemIds }),
    [patchPreferences],
  );

  return {
    preferences,
    saving,
    setPreset,
    setPinnedItemIds,
  };
}
