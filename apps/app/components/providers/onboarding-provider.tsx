"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  ReactNode,
} from "react";
import { useBusiness } from "@/lib/hooks/use-business";
import { getSupabaseClient } from "@/lib/supabase/client";

export type OnboardingStep = "profile" | "product" | "customer" | "sale";

interface OnboardingState {
  steps: Record<OnboardingStep, boolean>;
  isLoading: boolean;
  progress: number; // 0 to 100
  isComplete: boolean;
  refreshOnboarding: () => Promise<void>;
  dismissGuide: () => void;
  isGuideDismissed: boolean;
}

const OnboardingContext = createContext<OnboardingState | null>(null);

export function OnboardingProvider({ children }: { children: ReactNode }) {
  const { business } = useBusiness();
  const supabase = getSupabaseClient();

  const [steps, setSteps] = useState<Record<OnboardingStep, boolean>>({
    profile: true, // Assuming if they are here, profile exists partially
    product: false,
    customer: false,
    sale: false,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [isGuideDismissed, setIsGuideDismissed] = useState(false);

  // Check LocalStorage for dismissal
  useEffect(() => {
    if (typeof window !== "undefined") {
      const dismissed = localStorage.getItem("drx_onboarding_dismissed");
      if (dismissed === "true") setIsGuideDismissed(true);
    }
  }, []);

  const dismissGuide = () => {
    setIsGuideDismissed(true);
    localStorage.setItem("drx_onboarding_dismissed", "true");
  };

  const checkProgress = async () => {
    if (!business?.id || !supabase) return;

    try {
      // Parallel checks for speed
      const [inventoryRes, customerRes, salesRes] = await Promise.all([
        supabase
          .from("inventory")
          .select("id")
          .eq("business_id", business.id)
          .limit(1),
        supabase
          .from("customers")
          .select("id")
          .eq("business_id", business.id)
          .limit(1),
        supabase
          .from("sales")
          .select("id")
          .eq("business_id", business.id)
          .limit(1),
      ]);

      const newSteps = {
        profile: true,
        product: (inventoryRes.data?.length ?? 0) > 0,
        customer: (customerRes.data?.length ?? 0) > 0,
        sale: (salesRes.data?.length ?? 0) > 0,
      };

      setSteps(newSteps);
    } catch (err) {
      console.error("Failed to check onboarding progress", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    checkProgress();
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

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
