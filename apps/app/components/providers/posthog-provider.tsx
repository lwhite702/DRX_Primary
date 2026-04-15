"use client";

import React, { useEffect } from "react";
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

let analyticsInitialized = false;

// Re-export feature flag utilities for consumers
export { isFeatureEnabled, getFeatureFlag, onFeatureFlags, reloadFeatureFlags };

export function PostHogProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const key = process.env.NEXT_PUBLIC_POSTHOG_KEY;
  const host = process.env.NEXT_PUBLIC_POSTHOG_HOST || "https://us.i.posthog.com";
  
  // Get auth state for user identification
  const { isSignedIn, userId, orgId, isLoaded: authLoaded } = useAuth();
  const { user, isLoaded: userLoaded } = useUser();

  // Initialize analytics
  useEffect(() => {
    if (!key) return;
    if (analyticsInitialized) return;
    
    initAnalytics({
      apiKey: key,
      host,
      capturePageview: false,
      persistence: "localStorage+cookie",
      autocapture: true,
    });
    
    analyticsInitialized = true;
  }, [host, key]);

  // Identify user when authenticated
  useEffect(() => {
    if (!key || !analyticsInitialized) return;
    if (!authLoaded || !userLoaded) return;
    
    if (isSignedIn && userId) {
      // Build user traits
      const traits: Record<string, any> = {};
      
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
    } else if (!isSignedIn) {
      // Reset analytics when user signs out
      reset();
    }
  }, [key, authLoaded, userLoaded, isSignedIn, userId, orgId, user]);

  // Track page views
  useEffect(() => {
    if (!key || !pathname) return;
    const query = searchParams?.toString();
    const url = query ? `${pathname}?${query}` : pathname;
    capturePageView(url, { path: pathname });
  }, [key, pathname, searchParams]);

  return <>{children}</>;
}

/**
 * Identify the current user for analytics tracking
 * Use this for manual identification if needed
 */
export function identifyUser(userId: string, traits?: Record<string, any>) {
  if (!analyticsInitialized) return;
  identify(userId, traits);
}
