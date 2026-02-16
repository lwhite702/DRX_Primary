"use client";

import { useEffect } from "react";

type SentryFeedback = {
  createWidget: () => void;
};

type SentryBrowserClient = {
  getFeedback?: () => SentryFeedback | null;
};

function getSentryFeedback(): SentryFeedback | null {
  if (typeof window === "undefined") {
    return null;
  }
  const sentry = (window as Window & { Sentry?: SentryBrowserClient }).Sentry;
  return sentry?.getFeedback?.() ?? null;
}

/**
 * Feedback Widget
 *
 * Provides a user-friendly bug reporting interface that integrates
 * with error tracking via @wrelik/errors
 */
export function SentryFeedbackWidget() {
  useEffect(() => {
    // Initialize feedback widget
    const feedback = getSentryFeedback();

    if (feedback) {
      console.log("✅ Feedback widget initialized");
    }
  }, []);

  return null; // This component doesn't render anything
}

/**
 * Hook to trigger the feedback dialog
 */
export function useSentryFeedback() {
  const openFeedback = () => {
    const feedback = getSentryFeedback();
    if (feedback) {
      feedback.createWidget();
    } else {
      console.warn("Feedback widget not available");
    }
  };

  return { openFeedback };
}
