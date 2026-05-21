"use client";

import { useEffect, useRef } from "react";
import { useAuth, useUser } from "@/lib/adapters/auth/ui";
import { identify, setUserProperties } from "@wrelik/analytics/client";

/**
 * Hook to identify authenticated users in analytics
 * Call this in the root layout or app shell to ensure users are tracked
 */
export function useAnalyticsIdentity() {
  const { isSignedIn, userId, orgId } = useAuth();
  const { user } = useUser();
  const identifiedRef = useRef<string | null>(null);

  useEffect(() => {
    // Only identify if signed in and we have a userId
    if (!isSignedIn || !userId) {
      identifiedRef.current = null;
      return;
    }

    // Don't re-identify if already identified this user
    if (identifiedRef.current === userId) {
      return;
    }

    // Identify user with traits
    const traits: Record<string, any> = {
      email: user?.primaryEmailAddress?.emailAddress,
      name: user?.fullName,
      firstName: user?.firstName,
      lastName: user?.lastName,
      orgId: orgId || undefined,
    };

    // Remove undefined values
    Object.keys(traits).forEach((key) => {
      if (traits[key] === undefined) {
        delete traits[key];
      }
    });

    identify(userId, traits);
    identifiedRef.current = userId;
  }, [isSignedIn, userId, orgId, user]);
}

/**
 * Set additional user properties after initial identification
 */
export function useSetUserProperties(properties: Record<string, any>) {
  const { isSignedIn } = useAuth();

  useEffect(() => {
    if (!isSignedIn) return;
    if (!properties || Object.keys(properties).length === 0) return;

    setUserProperties(properties);
  }, [isSignedIn, properties]);
}
