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

import { PointerEventsGuardian } from "@/components/ui/pointer-events-guardian";

export function TelemetryProviders({ children }: { children: React.ReactNode }) {
  return (
    <PostHogProvider>
      <PointerEventsGuardian />
      {children}
    </PostHogProvider>
  );
}
