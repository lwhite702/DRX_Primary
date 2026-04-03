import Link from "next/link";
import Image from "next/image";

import { appLoginUrl, appWaitlistUrl } from "@/lib/app-links";
import { cyberNavItems } from "@/components/marketing/landing/cyber-data";

export function CyberNav() {
  return (
    <header className="pointer-events-none fixed inset-x-0 top-4 z-50 px-4">
      <div className="pointer-events-auto mx-auto flex w-full max-w-[896px] items-center justify-between gap-3 rounded-full border border-white/10 bg-white/[0.03] px-3 py-2 backdrop-blur-[16px]">
        <Link
          href="/"
          className="group flex min-w-0 items-center gap-2 rounded-full border border-white/10 bg-black/40 px-2 py-1"
        >
          <span className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-[10px] font-bold uppercase text-black">
            DRX
          </span>
          <Image
            src="/brand/drx-wordmark-color.svg"
            alt="Deelrx CRM"
            width={112}
            height={24}
            className="hidden h-5 w-auto opacity-90 transition-opacity group-hover:opacity-100 sm:block"
          />
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {cyberNavItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="technical-label rounded-full border border-white/10 bg-black/40 px-3 py-1 text-[10px] text-white/70 transition-colors hover:border-neon-lime/40 hover:text-neon-lime"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <span className="technical-label hidden items-center gap-2 rounded-full border border-neon-lime/30 bg-neon-lime/10 px-3 py-1 text-[10px] text-neon-lime sm:inline-flex">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-neon-lime" />
            Live
          </span>
          <Link
            href={appLoginUrl}
            className="hidden rounded-full border border-white/10 px-3 py-1.5 text-xs font-medium text-white/70 transition-colors hover:text-white sm:inline"
          >
            Login
          </Link>
          <Link
            href={appWaitlistUrl}
            className="neon-pulse-button rounded-full bg-neon-lime px-4 py-1.5 text-xs font-bold uppercase tracking-wide text-black"
          >
            Join Beta
          </Link>
        </div>
      </div>
    </header>
  );
}
