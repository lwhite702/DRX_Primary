"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useBusiness } from "@/lib/hooks/use-business";
import { OnboardingContext, type OnboardingStep } from "./onboarding-context";

function extractRows(payload: unknown): unknown[] {
  if (Array.isArray(payload)) return payload;
  if (
    payload &&
    typeof payload === "object" &&
    Array.isArray((payload as { data?: unknown[] }).data)
  ) {
    return (payload as { data: unknown[] }).data;
  }
  return [];
}

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { business } = useBusiness();

  const [steps, setSteps] = useState<Record<OnboardingStep, boolean>>({
    profile: true,
    product: false,
    customer: false,
    sale: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isGuideDismissed, setIsGuideDismissed] = useState(false);
  const requestVersion = useRef(0);
  const loadedBusinessId = useRef<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const dismissed = window.localStorage.getItem("drx_onboarding_dismissed");
    if (dismissed === "true") setIsGuideDismissed(true);
  }, []);

  const dismissGuide = () => {
    setIsGuideDismissed(true);
    if (typeof window !== "undefined") {
      window.localStorage.setItem("drx_onboarding_dismissed", "true");
    }
  };

  const checkProgress = useCallback(async () => {
    const version = ++requestVersion.current;
    if (!business?.id) {
      loadedBusinessId.current = null;
      setIsLoading(false);
      setIsRefreshing(false);
      setError(null);
      return;
    }

    const refreshInPlace = loadedBusinessId.current === business.id;
    setIsLoading(!refreshInPlace);
    setIsRefreshing(refreshInPlace);
    setError(null);

    try {
      const [inventoryRes, customerRes, baselineRes] = await Promise.all([
        fetch("/api/inventory?limit=1", {
          credentials: "same-origin",
          headers: { "x-business-id": business.id },
        }),
        fetch("/api/customers?limit=1", { credentials: "same-origin" }),
        fetch("/api/reports/pos-baseline", { credentials: "same-origin" }),
      ]);

      if (!inventoryRes.ok || !customerRes.ok || !baselineRes.ok) {
        throw new Error("Onboarding progress request failed");
      }

      const inventoryJson = inventoryRes.ok ? await inventoryRes.json() : null;
      const customerJson = customerRes.ok ? await customerRes.json() : null;
      const baselineJson = baselineRes.ok ? await baselineRes.json() : null;

      const inventoryRows = extractRows(inventoryJson);
      const customerRows = extractRows(customerJson);
      const hasSales =
        (baselineJson?.today?.salesCount ?? 0) > 0 ||
        (baselineJson?.week?.salesCount ?? 0) > 0 ||
        (Array.isArray(baselineJson?.recentSales) && baselineJson.recentSales.length > 0);

      if (version !== requestVersion.current) return;
      setSteps({
        profile: true,
        product: inventoryRows.length > 0,
        customer: customerRows.length > 0,
        sale: hasSales,
      });
      loadedBusinessId.current = business.id;
    } catch (err) {
      if (version !== requestVersion.current) return;
      console.error("Failed to check onboarding progress", err);
      setError("Setup progress could not be refreshed.");
    } finally {
      if (version === requestVersion.current) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [business?.id]);

  useEffect(() => {
    void checkProgress();
    return () => {
      requestVersion.current += 1;
    };
  }, [checkProgress]);

  const totalSteps = Object.keys(steps).length;
  const completedSteps = Object.values(steps).filter(Boolean).length;
  const progress = Math.round((completedSteps / totalSteps) * 100);

  return (
    <OnboardingContext.Provider
      value={{
        steps,
        isLoading,
        isRefreshing,
        error,
        progress,
        isComplete: progress === 100,
        refreshOnboarding: checkProgress,
        dismissGuide,
        isGuideDismissed,
      }}
    >
      {children}
    </OnboardingContext.Provider>
  );
}
