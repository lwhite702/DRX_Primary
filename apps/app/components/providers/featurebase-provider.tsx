"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { usePathname } from "next/navigation";

interface FeaturebaseProviderProps {
  user?: {
    id: string;
    email?: string;
    name?: string;
    createdAt?: string;
  } | null;
}

export function FeaturebaseProvider({ user }: FeaturebaseProviderProps) {
  const appId = process.env.NEXT_PUBLIC_FEATUREBASE_APP_ID;
  const pathname = usePathname();
  const isAuthSurface =
    pathname?.startsWith("/login") ||
    pathname?.startsWith("/register") ||
    pathname?.startsWith("/sign-in") ||
    pathname?.startsWith("/sign-up") ||
    pathname?.startsWith("/waitlist");
  const sanitizedEmail = sanitizeEmail(user?.email);
  const sanitizedUserId = sanitizeUserId(user?.id);

  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Fetch SSO token if user is present
    if (user && !isAuthSurface) {
      fetch("/api/featurebase/auth")
        .then((res) => res.json())
        .then((data) => {
          if (data.token) {
            setToken(data.token);
          }
        })
        .catch((err) =>
          console.error("Failed to fetch Featurebase token:", err),
        );
    }
  }, [isAuthSurface, user]);

  useEffect(() => {
    if (!appId || isAuthSurface) return;

    if (window.Featurebase) {
      // Re-identify if user or token changes
      if (user && token) {
        window.Featurebase("boot", {
          appId: appId,
          theme: "dark",
          email: sanitizedEmail,
          userId: sanitizedUserId,
          jwt: token, // passing JWT for secure verification (legacy support)
          featurebaseJwt: token, // correct key per documentation
        });
      }
    }
  }, [appId, isAuthSurface, sanitizedEmail, sanitizedUserId, token, user]);

  if (!appId || isAuthSurface) return null;

  return (
    <>
      <Script
        id="featurebase-sdk"
        strategy="afterInteractive"
        src="https://do.featurebase.app/js/sdk.js"
        onLoad={() => {
          if (window.Featurebase) {
            window.Featurebase("boot", {
              appId: appId,
              theme: "dark",
              email: sanitizedEmail,
              userId: sanitizedUserId,
              jwt: token,
              featurebaseJwt: token,
            });

            window.Featurebase("initialize_feedback_widget", {
              organization:
                process.env.NEXT_PUBLIC_FEATUREBASE_ORG || "deelrxcrm",
              theme: "dark",
              placement: "right",
              email: sanitizedEmail,
              featurebaseJwt: token,
              metadata: null,
            });
          }
        }}
      />
    </>
  );
}

export function sanitizeEmail(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim().toLowerCase();
  if (!/^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/i.test(normalized)) return undefined;
  return normalized;
}

export function sanitizeUserId(value?: string): string | undefined {
  if (!value) return undefined;
  const normalized = value.trim();
  if (!/^[a-zA-Z0-9:_-]{3,128}$/.test(normalized)) return undefined;
  return normalized;
}

// Add type definition for window
declare global {
  interface Window {
    Featurebase: any;
  }
}
