"use client";

import { useEffect } from "react";
import { trackMarketingEvent } from "@/lib/analytics";

export function LegalPageView({ slug }: { slug: string }) {
  useEffect(() => {
    trackMarketingEvent("open_legal_page", { slug });
  }, [slug]);

  return null;
}
