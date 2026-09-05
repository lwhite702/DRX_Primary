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
} from "@/lib/auth/dashboard-preferences";
import {
  getDashboardPreferencesAction,
  updateDashboardPreferencesAction,
} from "@/app/actions/dashboard-preferences";

const DASHBOARD_PREFS_EVENT = "drx:dashboard-preferences-updated";

type DashboardPreferencesPatch = Partial<Pick<DashboardPreferences, "preset">>;

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
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    authBypassEnabled ? "success" : "loading",
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const localPrefs = readPrefsFromLocalStorage();
    setPreferences(localPrefs ?? getDefaultDashboardPreferences());
    setError(null);

    if (authBypassEnabled) {
      setStatus("success");
      return;
    }

    let cancelled = false;
    setStatus("loading");

    void (async () => {
      try {
        const result = await getDashboardPreferencesAction();
        if (!cancelled && result.success) {
          setPreferences(result.preferences);
          writePrefsToLocalStorage(result.preferences);
          setStatus("success");
        } else if (!cancelled) {
          setStatus("error");
          setError("Dashboard view could not sync.");
        }
      } catch (caught) {
        console.warn("Failed to load server dashboard preferences:", caught);
        if (!cancelled) {
          setStatus("error");
          setError("Dashboard view could not sync.");
        }
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
      setError(null);
      try {
        const result = await updateDashboardPreferencesAction(patch);
        if (!result.success) {
          throw new Error(result.error);
        }
        setPreferences(result.preferences);
        writePrefsToLocalStorage(result.preferences);
        setStatus("success");
        return result.preferences;
      } catch (caught) {
        console.error("Failed to persist dashboard preferences:", caught);
        setStatus("error");
        setError("Dashboard view could not sync. Your local choice is still active.");
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

  return {
    preferences,
    status,
    error,
    saving,
    setPreset,
  };
}
