"use client";

import { useEffect, useRef } from "react";
import Script from "next/script";

export default function FeedbackPage() {
  const org = process.env.NEXT_PUBLIC_FEATUREBASE_ORG || "deelrxcrm";
  const initialized = useRef(false);

  useEffect(() => {
    if (initialized.current) return;

    if (window.Featurebase) {
      initialized.current = true;
      window.Featurebase("init_embed_widget", {
        organization: org,
        embedOptions: {
          path: "/", // Always start at root, internal routing handles the rest via syncing
          filters: "",
          routeSyncingBasePath: "/feedback",
        },
        stylingOptions: {
          theme: "dark",
          hideMenu: false,
          hideLogo: false,
        },
      });
    }
  }, [org]);

  return (
    <div className="w-full min-h-screen bg-background">
      {/* Container for the embed */}
      <div data-featurebase-embed className="w-full h-full min-h-[800px]" />

      {/* 
        Ensure SDK is present if accessed directly. 
        If FeaturebaseProvider is present in layout, this might be redundant but safe.
      */}
      <Script
        id="featurebase-sdk-embed"
        src="https://do.featurebase.app/js/sdk.js"
        onLoad={() => {
          if (!initialized.current && window.Featurebase) {
            initialized.current = true;
            window.Featurebase("init_embed_widget", {
              organization: org,
              embedOptions: {
                path: "/",
                filters: "",
                routeSyncingBasePath: "/feedback",
              },
              stylingOptions: {
                theme: "dark",
                hideMenu: false,
                hideLogo: false,
              },
            });
          }
        }}
      />
    </div>
  );
}
