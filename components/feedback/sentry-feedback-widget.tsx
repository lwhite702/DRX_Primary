"use client";

import { useEffect } from "react";
import * as Sentry from "@sentry/nextjs";

/**
 * Sentry Feedback Widget
 *
 * Provides a user-friendly bug reporting interface that integrates
 * with Sentry's feedback system. Can be triggered programmatically
 * or from error boundaries.
 */
export function SentryFeedbackWidget() {
  useEffect(() => {
    // Initialize Sentry Feedback widget
    const feedback = Sentry.getFeedback();

    if (feedback) {
      // Widget is available and configured
      console.log("✅ Sentry Feedback widget initialized");
    }
  }, []);

  return null; // This component doesn't render anything
}

/**
 * Hook to trigger the Sentry feedback dialog
 */
export function useSentryFeedback() {
  const openFeedback = () => {
    const feedback = Sentry.getFeedback();
    if (feedback) {
      feedback.createWidget();
    } else {
      console.warn("Sentry Feedback not available");
    }
  };

  return { openFeedback };
}
