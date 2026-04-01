"use client";

import React from "react";
import posthog from "posthog-js";
import { usePathname, useSearchParams } from "next/navigation";
import { useEffect } from "react";

let posthogInitialized = false;

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";

  useEffect(() => {
    if (!key) return;
    if (posthogInitialized) return;
    posthog.init(key, {
      api_host: host,
      capture_pageview: false,
      persistence: "localStorage+cookie",
      autocapture: true,
      loaded: (instance) => {
        instance.set_config({ capture_pageleave: true });
      },
    });
    posthogInitialized = true;
  }, [host, key]);

  useEffect(() => {
    if (!key || !pathname) return;
    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    posthog.capture("$pageview", { $current_url: url, path: pathname });
  }, [key, pathname, searchParams]);

  return <>{children}</>;
}
