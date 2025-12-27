"use client";

import posthog from "posthog-js";
import { PostHogProvider as PHProvider } from "posthog-js/react";
import { useEffect } from "react";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    if (
      !window.location.host.includes("127.0.0.1") &&
      !window.location.host.includes("localhost")
    ) {
      // Init PostHog roughly if keys present
      // In a real app we'd use process.env.NEXT_PUBLIC_POSTHOG_KEY
      // For now, we stub it or use a placeholder if not set to avoid errors
      if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
        posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
          api_host:
            process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://app.posthog.com",
          person_profiles: "identified_only",
          capture_pageview: false,
        });
      }
    }
  }, []);

  return <PHProvider client={posthog}>{children}</PHProvider>;
}
