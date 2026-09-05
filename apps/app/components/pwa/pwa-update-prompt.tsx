"use client";

import { useEffect, useState } from "react";
import { RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

export function PWAUpdatePrompt() {
  const [updateAvailable, setUpdateAvailable] = useState(false);
  const [registration, setRegistration] = useState<ServiceWorkerRegistration | null>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) {
      return;
    }

    const handleWaitingWorker = (reg: ServiceWorkerRegistration) => {
      setRegistration(reg);
      setUpdateAvailable(true);
    };

    navigator.serviceWorker.getRegistration().then((reg) => {
      if (!reg) return;

      if (reg.waiting) {
        handleWaitingWorker(reg);
      }

      reg.addEventListener("updatefound", () => {
        const newWorker = reg.installing;
        if (!newWorker) return;

        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            handleWaitingWorker(reg);
          }
        });
      });
    }).catch(() => {
      // Service worker lookup failed or not active
    });

    let refreshing = false;
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (!refreshing) {
        refreshing = true;
        window.location.reload();
      }
    });
  }, []);

  const handleUpdate = () => {
    if (registration?.waiting) {
      registration.waiting.postMessage({ type: "SKIP_WAITING" });
    } else {
      window.location.reload();
    }
  };

  if (!updateAvailable) return null;

  return (
    <div
      role="alert"
      className="fixed bottom-20 md:bottom-6 left-4 right-4 md:left-auto md:right-6 z-50 max-w-sm rounded-xl border border-accent/40 bg-card p-3.5 shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-3"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="h-8 w-8 rounded-full bg-accent/20 text-accent flex items-center justify-center shrink-0">
            <RefreshCw className="h-4 w-4 animate-spin" />
          </div>
          <div className="min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">Update Available</p>
            <p className="text-[11px] text-muted-foreground">Reload to apply latest features</p>
          </div>
        </div>
        <Button
          type="button"
          size="sm"
          onClick={handleUpdate}
          className="h-8 px-3 text-xs font-semibold bg-accent text-black hover:bg-accent/90 shrink-0"
        >
          Update Now
        </Button>
      </div>
    </div>
  );
}
