"use client";

import { useEffect, useState } from "react";
import { appLoginUrl } from "@/lib/app-links";

const STORAGE_KEY = "drx_app_suggestion_status";
const DISMISS_DURATION_MS = 14 * 24 * 60 * 60 * 1000; // 14 days

export function MarketingAppSuggestion() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) {
        setVisible(true);
        return;
      }
      const data = JSON.parse(stored);
      if (data.status === "permanent") {
        setVisible(false);
        return;
      }
      if (data.dismissedAt) {
        const timePassed = Date.now() - data.dismissedAt;
        if (timePassed < DISMISS_DURATION_MS) {
          setVisible(false);
          return;
        }
      }
      setVisible(true);
    } catch {
      setVisible(true);
    }
  }, []);

  const handleDismiss = () => {
    setVisible(false);
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ status: "dismissed", dismissedAt: Date.now() })
      );
    } catch {
      // Ignore storage write failures in private browsing
    }
  };

  const handleOpen = () => {
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ status: "permanent" })
      );
    } catch {
      // Ignore
    }
  };

  if (!visible) return null;

  return (
    <aside
      className="md:hidden w-full border-y border-border bg-background px-5 py-2.5"
      aria-label="App Availability Suggestion"
    >
      <div className="mx-auto flex max-w-[350px] items-center justify-between gap-2">
        <div className="flex flex-1 flex-col">
          <p className="text-[14px] font-normal leading-[20px] text-text-primary">
            Prefer the app?
          </p>
          <p className="text-[12px] font-medium leading-[16px] text-muted-foreground tracking-[0.1px]">
            Open it when you’re ready.
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <a
            href={appLoginUrl}
            onClick={handleOpen}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[6px] bg-accent px-3 text-[12px] font-medium text-primary-foreground tracking-[0.1px] hover:opacity-95 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
          >
            Open
          </a>

          <button
            type="button"
            onClick={handleDismiss}
            className="flex min-h-[44px] min-w-[44px] items-center justify-center text-[20px] text-muted-foreground hover:text-text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
            aria-label="Dismiss app suggestion for 14 days"
          >
            ×
          </button>
        </div>
      </div>
    </aside>
  );
}
