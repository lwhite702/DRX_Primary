"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";

import { topNavLinks } from "./nav-config";
import { cn } from "@deelrx/ui";
import { trackMarketingEvent } from "@/lib/analytics";
import { appLoginUrl, appWaitlistUrl } from "@/lib/app-links";

export function SiteHeader() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-50 border-b border-border/50 bg-background/90 backdrop-blur-md">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 py-4">
        <Link href="/" className="flex items-center gap-3">
          <Image
            src="/brand/drx-wordmark-color.svg"
            alt="Deelrx CRM"
            width={150}
            height={32}
            className="h-8 w-auto"
          />
          <span className="hidden text-xs font-mono uppercase tracking-widest text-neon-lime md:inline">
            BETA
          </span>
        </Link>

        <nav className="hidden items-center gap-5 md:flex">
          {topNavLinks.map((link) => {
            const active =
              pathname === link.href ||
              pathname.startsWith(link.href + "/");

            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "text-sm font-medium text-text-secondary transition-colors hover:text-neon-lime",
                  active && "text-neon-lime"
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
            className="hidden rounded-full border border-border px-4 py-2 text-xs font-medium text-text-secondary transition-colors hover:text-white md:inline"
          >
            Login
          </Link>
          <Link
            href={appWaitlistUrl}
            className="rounded-full bg-neon-lime px-4 py-2 text-xs font-bold uppercase tracking-wide text-black transition-all hover:brightness-95"
            onClick={() =>
              trackMarketingEvent("click_primary_cta", {
                location: "header",
                href: appWaitlistUrl,
              })
            }
          >
            Join Beta Waitlist
          </Link>
        </div>
      </div>
    </header>
  );
}
