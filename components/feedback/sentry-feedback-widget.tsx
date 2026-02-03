"use client";

import { useEffect } from "react";
import { errorTracker } from "@wrelik/errors";

/**
 * Feedback Widget
 *
 * Provides a user-friendly bug reporting interface that integrates
 * with error tracking via @wrelik/errors
 */
export function SentryFeedbackWidget() {
  useEffect(() => {
    // Initialize feedback widget
    const feedback = errorTracker.getFeedback();

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
    const feedback = errorTracker.getFeedback();
    if (feedback) {
      feedback.createWidget();
    } else {
      console.warn("Feedback widget not available");
    }
  };

  return { openFeedback };
}
