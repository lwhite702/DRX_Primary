"use client";

import Link from "next/link";
import { trackMarketingEvent } from "@/lib/analytics";
import { appWaitlistUrl } from "@/lib/app-links";

export function CtaRow({
  primaryLabel = "Join the Beta",
  primaryHref = appWaitlistUrl,
  secondaryLabel,
  secondaryHref,
  location,
}: {
  primaryLabel?: string;
  primaryHref?: string;
  secondaryLabel?: string;
  secondaryHref?: string;
  location: string;
}) {
  return (
    <div className="mt-5 flex flex-wrap gap-3">
      <Link
        href={primaryHref}
        className="rounded-xl border border-accent/40 bg-accent px-5 py-2 text-sm font-bold uppercase tracking-wide text-black shadow-[0_14px_24px_rgba(204,255,0,0.2)] transition hover:brightness-95"
        onClick={() =>
          trackMarketingEvent("click_primary_cta", {
            location,
            href: primaryHref,
            label: primaryLabel,
          })
        }
      >
        {primaryLabel}
      </Link>
      {secondaryLabel && secondaryHref ? (
        <Link
          href={secondaryHref}
          className="rounded-xl border border-white/20 px-5 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-white"
          onClick={() =>
            trackMarketingEvent("click_secondary_cta", {
              location,
              href: secondaryHref,
              label: secondaryLabel,
            })
          }
        >
          {secondaryLabel}
        </Link>
      ) : null}
    </div>
  );
}
