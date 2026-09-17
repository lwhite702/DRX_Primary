"use client";

import dynamic from "next/dynamic";
import React from "react";

const PostHogProvider = dynamic(
  () =>
    import("@/components/providers/posthog-provider").then(
      (mod) => mod.PostHogProvider,
    ),
  { ssr: false },
);

const FeaturebaseProvider = dynamic(
  () =>
    import("@/components/providers/featurebase-provider").then(
      (mod) => mod.FeaturebaseProvider,
    ),
  { ssr: false },
);

export function TelemetryProviders({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <FeaturebaseProvider />
      {children}
    </PostHogProvider>
  );
}
