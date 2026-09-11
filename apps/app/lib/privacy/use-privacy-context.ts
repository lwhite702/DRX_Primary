"use client";
import { useCallback, useEffect, useState } from "react";
import { useBusiness } from "@/lib/hooks/use-business";
import type { PrivacyProtocolSettings } from "./types";
import { fetchPrivacyContext } from "./client-context";

export function usePrivacyContext(active = true) {
  const { business } = useBusiness();
  const businessId = business?.id ? String(business.id) : null;
  const [revision, setRevision] = useState(0);
  const scope = JSON.stringify([businessId, active, revision]);
  const [state, setState] = useState<{ scope: string; protocol: PrivacyProtocolSettings | null; manualEnabled: boolean; error: string | null }>({ scope: "", protocol: null, manualEnabled: false, error: null });
  const retry = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    window.addEventListener("focus", retry);
    window.addEventListener("drx:privacy-updated", retry);
    return () => { window.removeEventListener("focus", retry); window.removeEventListener("drx:privacy-updated", retry); };
  }, [retry]);
  useEffect(() => {
    if (!active || !businessId) return;
    const controller = new AbortController();
    fetchPrivacyContext(businessId, controller.signal).then(value => {
      if (!controller.signal.aborted) setState({ scope, ...value, error: null });
    }).catch(() => {
      if (!controller.signal.aborted) setState({ scope, protocol: null, manualEnabled: false, error: "We could not load privacy settings. Retry before viewing customer details." });
    });
    return () => controller.abort();
  }, [active, businessId, scope]);
  const current = state.scope === scope ? state : null;
  return { businessId, protocol: current?.protocol ?? null, manualEnabled: current?.manualEnabled ?? false, error: current?.error ?? null, loading: active && !current, retry };
}
