"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { trackMarketingEvent } from "@/lib/analytics";

export function PageViewTracker() {
  const pathname = usePathname();

  useEffect(() => {
    trackMarketingEvent("view_page", { path: pathname });
  }, [pathname]);

  return null;
}
