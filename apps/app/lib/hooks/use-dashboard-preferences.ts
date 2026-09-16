"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { useUser } from "@/lib/adapters/auth/ui";
import { useBusiness } from "@/lib/hooks/use-business";
import { getDefaultDashboardPreferences, type DashboardPreferences, type DashboardViewPreset } from "@/lib/auth/dashboard-preferences";
import { getDashboardPreferencesAction, updateDashboardPreferencesAction } from "@/app/actions/dashboard-preferences";
const eventName = "drx:dashboard-preferences-updated";
type State = { scope: string; preferences: DashboardPreferences; status: "loading" | "success" | "error"; error: string | null; saving: boolean };
export function useDashboardPreferences() {
  const { user } = useUser();
  const { business } = useBusiness();
  const businessId = business?.id ? String(business.id) : undefined;
  const scope = JSON.stringify([user?.id, businessId]);
  const activeScope = useRef(scope); activeScope.current = scope;
  const sequence = useRef(0);
  const [revision, setRevision] = useState(0);
  const [state, setState] = useState<State>({ scope: "", preferences: getDefaultDashboardPreferences(), status: "loading", error: null, saving: false });
  const current = state.scope === scope ? state : { scope, preferences: getDefaultDashboardPreferences(), status: "loading" as const, error: null, saving: false };
  useEffect(() => {
    const request = ++sequence.current;
    if (!user?.id || !businessId) return;
    let cancelled = false;
    getDashboardPreferencesAction(businessId).then(result => {
      if (cancelled || request !== sequence.current || activeScope.current !== scope) return;
      setState({ scope, preferences: result.success ? result.preferences : getDefaultDashboardPreferences(), status: result.success ? "success" : "error", error: result.success ? null : result.error, saving: false });
    }).catch(() => {
      if (!cancelled && request === sequence.current && activeScope.current === scope) setState({ scope, preferences: getDefaultDashboardPreferences(), status: "error", error: "Dashboard view could not load.", saving: false });
    });
    return () => { cancelled = true; };
  }, [scope, user?.id, businessId, revision]);
  useEffect(() => {
    const refresh = (event: Event) => { if ((event as CustomEvent<string>).detail === scope) setRevision(value => value + 1); };
    window.addEventListener(eventName, refresh);
    return () => window.removeEventListener(eventName, refresh);
  }, [scope]);
  const setPreset = useCallback(async (preset: DashboardViewPreset) => {
    if (!businessId || !user?.id) return getDefaultDashboardPreferences();
    const request = ++sequence.current;
    setState(previous => ({ ...previous, preferences: previous.scope === scope ? previous.preferences : getDefaultDashboardPreferences(), scope, saving: true, error: null }));
    try {
      const result = await updateDashboardPreferencesAction({ preset }, businessId);
      if (activeScope.current !== scope || request !== sequence.current) return getDefaultDashboardPreferences();
      if (!result.success) throw new Error(result.error);
      setState({ scope, preferences: result.preferences, status: "success", error: null, saving: false });
      window.dispatchEvent(new CustomEvent(eventName, { detail: scope }));
      return result.preferences;
    } catch {
      if (activeScope.current === scope && request === sequence.current) setState(previous => ({ ...previous, scope, status: "error", saving: false, error: "Dashboard view could not be saved. Please retry." }));
      return getDefaultDashboardPreferences();
    }
  }, [businessId, user?.id, scope]);
  return { preferences: current.preferences, status: current.status, error: current.error, saving: current.saving, setPreset };
}
