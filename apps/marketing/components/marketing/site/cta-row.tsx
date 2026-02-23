"use client";

import Link from "next/link";
import { trackMarketingEvent } from "@/lib/analytics";
import { appWaitlistUrl } from "@/lib/app-links";

export function CtaRow({
  primaryLabel = "Join Beta Waitlist",
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
    <div className="mt-4 flex flex-wrap gap-3">
      <Link
        href={primaryHref}
        className="rounded-full bg-neon-lime px-5 py-2 text-sm font-bold uppercase tracking-wide text-black transition-all hover:brightness-95"
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
          className="rounded-full border border-border px-5 py-2 text-sm font-medium text-text-secondary transition-colors hover:text-white"
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
