import { docsHelpdeskUrl } from "@/lib/featurebase-links";

export function openMintlifyHelp(): boolean {
  if (typeof window === "undefined") return false;
  window.open(docsHelpdeskUrl, "_blank", "noopener,noreferrer");
  return true;
}

/** @deprecated Use openMintlifyHelp */
export const openFeaturebaseHelpdesk = openMintlifyHelp;

export async function openFeedbackWithFallback(
  openSentryFeedback: (() => unknown) | null | undefined,
): Promise<"sentry" | "docs" | "unavailable"> {
  if (openSentryFeedback) {
    try {
      await openSentryFeedback();
      return "sentry";
    } catch (error) {
      console.error("Error opening feedback form:", error);
    }
  }

  return openMintlifyHelp() ? "docs" : "unavailable";
}
