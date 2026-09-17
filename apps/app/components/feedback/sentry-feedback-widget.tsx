"use client";

import { useEffect } from "react";
import {
  getSentryFeedbackClient,
  openSentryFeedbackDialog,
  type SentryFeedbackFormOptions,
} from "@/lib/sentry/feedback";

/**
 * Feedback Widget
 *
 * Provides a user-friendly bug reporting interface that integrates
 * with Sentry error and feedback tracking.
 */
export function SentryFeedbackWidget() {
  useEffect(() => {
    const feedback = getSentryFeedbackClient();
    if (feedback && process.env.NODE_ENV !== "production") {
      console.log("[feedback] Sentry feedback client ready");
    }
  }, []);

  return null;
}

/**
 * Hook to trigger the feedback dialog
 */
export function useSentryFeedback() {
  const openFeedback = async (options?: SentryFeedbackFormOptions) => {
    const opened = await openSentryFeedbackDialog(options);
    if (!opened) {
      console.warn("[feedback] Sentry feedback widget not available");
    }
    return opened;
  };

  return { openFeedback };
}
