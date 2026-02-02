"use client";

import { AnalyticsProvider as WrelikAnalyticsProvider } from "@wrelik/analytics";

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  return <WrelikAnalyticsProvider>{children}</WrelikAnalyticsProvider>;
}
