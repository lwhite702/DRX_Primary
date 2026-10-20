"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { topNavLinks, headerCta } from "./nav-config";
import { cn } from "@deelrx/ui";
import { trackMarketingEvent } from "@/lib/analytics";
import { appLoginUrl } from "@/lib/app-links";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-white/10 bg-black/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/drx-wordmark-color.svg"
            alt="Deelrx CRM"
            width={150}
            height={32}
            className="h-8 w-auto"
          />
          <span className="hidden rounded-full border border-accent/40 bg-accent/10 px-2 py-0.5 text-[10px] font-mono uppercase tracking-[0.18em] text-accent md:inline">
            Beta
          </span>
        </Link>

        <nav className="hidden items-center gap-6 md:flex">
          {topNavLinks.map((link) => {
            const active = link.href === "/" && pathname === "/";

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium text-text-secondary transition-colors hover:text-accent",
                  active && "text-white"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href={appLoginUrl}
            className="hidden rounded-xl border border-white/15 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-text-secondary transition-colors hover:text-white md:inline"
          >
            Login
          </Link>
          <Link
            href={headerCta.href}
            data-motion="button"
            className="drx-button-motion rounded-xl border border-accent/40 bg-accent px-4 py-2 text-xs font-bold uppercase tracking-wide text-black shadow-[0_14px_24px_rgba(204,255,0,0.2)] hover:brightness-95"
            onClick={() =>
              trackMarketingEvent("click_primary_cta", {
                location: "header",
                href: headerCta.href,
              })
            }
          >
            {headerCta.label}
          </Link>
        </div>
      </div>
    </header>
  );
}
