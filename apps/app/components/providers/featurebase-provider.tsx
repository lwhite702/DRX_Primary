"use client";

import { useEffect, useState } from "react";
import Script from "next/script";

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

  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    // Fetch SSO token if user is present
    if (user) {
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
  }, [user]);

  useEffect(() => {
    if (!appId) return;

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
  }, [user, token, appId]);

  if (!appId) return null;

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
