"use client";

import { useEffect, useState } from "react";
import { Smartphone, X, Download } from "lucide-react";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "drx_native_app_banner_dismissed_at";
const DISMISSAL_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function NativeAppBanner() {
  const [visible, setVisible] = useState(false);
  const [platform, setPlatform] = useState<"ios" | "android" | "other">("other");

  useEffect(() => {
    if (typeof window === "undefined" || typeof navigator === "undefined") return;

    const userAgent = navigator.userAgent || "";
    const isIOS = /iPad|iPhone|iPod/.test(userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
    const isAndroid = /Android/.test(userAgent);
    const isMobileDevice = isIOS || isAndroid || window.innerWidth < 768;

    if (!isMobileDevice) {
      return;
    }

    if (isIOS) setPlatform("ios");
    else if (isAndroid) setPlatform("android");
    else setPlatform("other");

    try {
      const dismissedAtStr = localStorage.getItem(STORAGE_KEY);
      if (dismissedAtStr) {
        const dismissedAt = Number.parseInt(dismissedAtStr, 10);
        if (!Number.isNaN(dismissedAt) && Date.now() - dismissedAt < DISMISSAL_DURATION_MS) {
          return;
        }
      }
    } catch {
      // localStorage may be unavailable in private browsing
    }

    const timer = setTimeout(() => {
      setVisible(true);
    }, 1000);

    return () => clearTimeout(timer);
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, Date.now().toString());
    } catch {
      // Ignore localStorage errors
    }
  };

  const handleOpenApp = () => {
    const deepLink = "drx://";
    const startTime = Date.now();

    window.location.href = deepLink;

    setTimeout(() => {
      if (Date.now() - startTime < 1500) {
        if (platform === "ios") {
          window.open("https://testflight.apple.com", "_blank");
        } else if (platform === "android") {
          window.open("https://play.google.com", "_blank");
        }
      }
    }, 1000);
  };

  if (!visible) return null;

  return (
    <div
      role="region"
      aria-label="Native app suggestion"
      className="md:hidden relative border-b border-border/80 bg-gradient-to-r from-card to-muted/90 px-4 py-2.5 shadow-sm transition-all duration-300 animate-in fade-in slide-in-from-top-2"
    >
      <div className="flex items-center justify-between gap-3 max-w-lg mx-auto">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="h-9 w-9 rounded-lg bg-accent/15 border border-accent/20 flex items-center justify-center shrink-0 text-accent">
            <Smartphone className="h-5 w-5" />
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold text-foreground truncate">
              Try the native DRX app
            </p>
            <p className="text-[11px] text-muted-foreground line-clamp-1">
              Optimized for fast mobile checkout & scanner
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          <Button
            type="button"
            size="sm"
            onClick={handleOpenApp}
            className="h-8 px-2.5 text-xs font-semibold bg-accent text-black hover:bg-accent/90 shrink-0"
          >
            <Download className="h-3.5 w-3.5 mr-1" />
            Open App
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            onClick={handleDismiss}
            aria-label="Dismiss app banner"
            className="h-8 w-8 text-muted-foreground hover:text-foreground shrink-0 rounded-full"
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
