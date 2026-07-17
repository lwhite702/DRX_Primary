"use client";

import React, { useEffect, useRef, Suspense } from "react";
import { usePathname, useSearchParams } from "next/navigation";
import {
  initAnalytics,
  capturePageView,
  identify,
  isFeatureEnabled,
  getFeatureFlag,
  onFeatureFlags,
  reloadFeatureFlags,
  reset,
} from "@wrelik/analytics/client";
import { useAuth, useUser } from "@/lib/adapters/auth/ui";
import * as Sentry from "@sentry/nextjs";

let analyticsInitialized = false;

// Re-export feature flag utilities for consumers
export { isFeatureEnabled, getFeatureFlag, onFeatureFlags, reloadFeatureFlags };

function PostHogPageView() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;

  useEffect(() => {
    if (!key || !pathname) return;
    
    const isAuthSurface =
      pathname?.startsWith("/login") ||
      pathname?.startsWith("/register") ||
      pathname?.startsWith("/sign-in") ||
      pathname?.startsWith("/sign-up") ||
      pathname?.startsWith("/waitlist");

    if (isAuthSurface) return;

    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    capturePageView(url, { path: pathname });
  }, [key, pathname, searchParams]);

  return null;
}

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const identifiedUserId = useRef<string | null>(null);
  const pathname = usePathname();
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  const isAuthSurface =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/sign-in") ||
    pathname?.startsWith("/sign-up") ||
    pathname?.startsWith("/waitlist");

  // Get auth state for user identification
  const { isSignedIn, userId, orgId, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();

  // Initialize analytics
  useEffect(() => {
    if (!key || isAuthSurface) return;
    if (analyticsInitialized) return;

    initAnalytics({
      apiKey: key,
      host,
      capturePageview: false,
      persistence: "localStorage+cookie",
      autocapture: true,
    });

    analyticsInitialized = true;
  }, [host, isAuthSurface, key]);

  // Identify user when authenticated
  useEffect(() => {
    if (!key || !analyticsInitialized) return;
    if (!authLoaded || !userLoaded) return;

    if (isSignedIn && userId) {
      if (identifiedUserId.current && identifiedUserId.current !== userId) {
        reset();
        Sentry.setUser(null);
      }
      // Build user traits
      const traits: Record<string, any> = {
        platform: "web",
        distribution_channel: "web",
      };

      if (user?.primaryEmailAddress?.emailAddress) {
        traits.email = user.primaryEmailAddress.emailAddress;
      }
      if (user?.fullName) {
        traits.name = user.fullName;
      }
      if (user?.firstName) {
        traits.firstName = user.firstName;
      }
      if (user?.lastName) {
        traits.lastName = user.lastName;
      }
      if (orgId) {
        traits.orgId = orgId;
      }

      identify(userId, traits);
      identifiedUserId.current = userId;
      Sentry.setUser({
        id: userId,
        email: user?.primaryEmailAddress?.emailAddress,
        username: user?.fullName || undefined,
      });
      Sentry.setTag("platform", "web");
      Sentry.setTag("distribution_channel", "web");
      Sentry.setTag("business_id", orgId || "none");
    } else if (!isSignedIn) {
      // Reset analytics when user signs out
      reset();
      Sentry.setUser(null);
      Sentry.setTag("business_id", "none");
      identifiedUserId.current = null;
    }
  }, [key, authLoaded, userLoaded, isSignedIn, userId, orgId, user]);

  return (
    <>
      <Suspense fallback={null}>
        <PostHogPageView />
      </Suspense>
      {children}
    </>
  );
}

/**
 * Identify the current user for analytics tracking
 * Use this for manual identification if needed
 */
export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (!analyticsInitialized) return;
  identify(userId, traits);
}
