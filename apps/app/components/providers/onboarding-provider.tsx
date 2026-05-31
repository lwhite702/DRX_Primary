"use client";

import {
  useEffect,
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
  const [isGuideDismissed, setIsGuideDismissed] = useState(false);

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

  const checkProgress = async () => {
    if (!business?.id) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);

    try {
      const [inventoryRes, customerRes, baselineRes] = await Promise.all([
        fetch("/api/inventory?limit=1", { credentials: "same-origin" }),
        fetch("/api/customers?limit=1", { credentials: "same-origin" }),
        fetch("/api/reports/pos-baseline", { credentials: "same-origin" }),
      ]);

      const inventoryJson = inventoryRes.ok ? await inventoryRes.json() : null;
      const customerJson = customerRes.ok ? await customerRes.json() : null;
      const baselineJson = baselineRes.ok ? await baselineRes.json() : null;

      const inventoryRows = extractRows(inventoryJson);
      const customerRows = extractRows(customerJson);
      const hasSales =
        (baselineJson?.today?.salesCount ?? 0) > 0 ||
        (baselineJson?.week?.salesCount ?? 0) > 0 ||
        (Array.isArray(baselineJson?.recentSales) && baselineJson.recentSales.length > 0);

      setSteps({
        profile: true,
        product: inventoryRows.length > 0,
        customer: customerRows.length > 0,
        sale: hasSales,
      });
    } catch (err) {
      console.error("Failed to check onboarding progress", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void checkProgress();
  }, [business?.id]);

  const totalSteps = Object.keys(steps).length;
  const completedSteps = Object.values(steps).filter(Boolean).length;
  const progress = Math.round((completedSteps / totalSteps) * 100);

  return (
    <OnboardingContext.Provider
      value={{
        steps,
        isLoading,
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
