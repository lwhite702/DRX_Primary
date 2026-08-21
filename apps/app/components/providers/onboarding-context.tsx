"use client";

import { createContext, useContext } from "react";

export type OnboardingStep = "profile" | "product" | "customer" | "sale";

export interface OnboardingState {
  steps: Record<OnboardingStep, boolean>;
  isLoading: boolean;
  isRefreshing: boolean;
  error: string | null;
  progress: number;
  isComplete: boolean;
  refreshOnboarding: () => Promise<void>;
  dismissGuide: () => void;
  isGuideDismissed: boolean;
}

export const OnboardingContext = createContext<OnboardingState | null>(null);

export function useOnboarding() {
  const context = useContext(OnboardingContext);
  if (!context) {
    throw new Error("useOnboarding must be used within an OnboardingProvider");
  }
  return context;
}
