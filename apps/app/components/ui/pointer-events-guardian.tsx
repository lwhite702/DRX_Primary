"use client";

import { useEffect } from "react";

export function PointerEventsGuardian() {
  useEffect(() => {
    if (typeof document === "undefined") return;

    const checkAndRestore = () => {
      if (document.body.style.pointerEvents === "none") {
        const hasOpenModal = document.querySelector(
          '[data-state="open"][role="dialog"], [data-state="open"][role="alertdialog"], [data-slot="dialog-content"][data-state="open"], [data-radix-portal] [data-state="open"], [data-slot="sheet-content"][data-state="open"]'
        );
        if (!hasOpenModal) {
          document.body.style.pointerEvents = "";
        }
      }
    };

    const observer = new MutationObserver(() => {
      checkAndRestore();
    });

    observer.observe(document.body, {
      attributes: true,
      attributeFilter: ["style"],
      childList: true,
      subtree: true,
    });

    const interval = setInterval(checkAndRestore, 400);

    return () => {
      observer.disconnect();
      clearInterval(interval);
    };
  }, []);

  return null;
}
