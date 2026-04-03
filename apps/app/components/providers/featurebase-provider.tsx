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
          email: user.email,
          userId: user.id,
          jwt: token, // passing JWT for secure verification (legacy support)
          featurebaseJwt: token, // correct key per documentation
        });
      }
    }
  }, [appId, isAuthSurface, token, user]);

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
              email: user?.email,
              userId: user?.id,
              jwt: token,
              featurebaseJwt: token,
            });

            window.Featurebase("initialize_feedback_widget", {
              organization:
                process.env.NEXT_PUBLIC_FEATUREBASE_ORG || "deelrxcrm",
              theme: "dark",
              placement: "right",
              email: user?.email,
              featurebaseJwt: token,
              metadata: null,
            });
          }
        }}
      />
    </>
  );
}

// Add type definition for window
declare global {
  interface Window {
    Featurebase: any;
  }
}
