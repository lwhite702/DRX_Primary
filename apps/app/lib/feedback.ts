import { featurebaseHelpdeskUrl } from "@/lib/featurebase-links";

export function openFeaturebaseHelpdesk(): boolean {
  if (typeof window === "undefined") return false;
  window.open(featurebaseHelpdeskUrl, "_blank", "noopener,noreferrer");
  return true;
}

export async function openFeedbackWithFallback(
  openSentryFeedback: (() => void | Promise<void>) | null | undefined,
): Promise<"sentry" | "featurebase" | "unavailable"> {
  if (openSentryFeedback) {
    try {
      await openSentryFeedback();
      return "sentry";
    } catch (error) {
      console.error("Error opening feedback form:", error);
    }
  }

  return openFeaturebaseHelpdesk() ? "featurebase" : "unavailable";
}
