"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import { marketingContent } from "@/lib/marketing-content";
import { X } from "lucide-react";
import { BrandMark } from "./brand-mark";
import { appWaitlistUrl } from "@/lib/app-links";

const navLinks = [
  { label: "Product", href: "#product" },
  { label: "Workflows", href: "#workflows" },
  { label: "Privacy", href: "#privacy" },
  { label: "Apps", href: "#apps" },
  { label: "FAQ", href: "#faq" },
];

export function MarketingNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);

  return (
    <header className="sticky top-0 z-50 w-full bg-background/95 backdrop-blur-md border-b border-border/40" onKeyDown={(event) => {
      if (event.key === "Escape" && mobileMenuOpen) {
        setMobileMenuOpen(false);
        menuButton.current?.focus();
      }
    }}>
      {/* Skip Link for WCAG 2.2 AA */}
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-4 focus:z-[100] focus:px-4 focus:py-2 focus:bg-accent focus:text-primary-foreground focus:font-medium focus:rounded-md focus:shadow-lg focus:outline-none"
      >
        Skip to main content
      </a>

      <div className="mx-auto flex min-h-[64px] md:min-h-[72px] max-w-[1280px] flex-wrap gap-2 items-center justify-between px-5 md:px-8 lg:px-10 py-2">
        {/* Canonical Brand Mark */}
        <div className="flex items-center">
          <BrandMark variant="wordmark" className="h-[38px] md:h-[44px] w-auto" priority />
        </div>

        {/* Desktop & Tablet Navigation */}
        <nav
          className="hidden md:flex items-center gap-1 lg:gap-2"
          aria-label="Main Navigation"
        >
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="flex min-h-[44px] min-w-[44px] items-center justify-center px-2 lg:px-3 text-[14px] text-text-primary hover:text-accent transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background rounded-md"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        {/* Action Button & Mobile Menu Toggle */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            ref={menuButton}
            type="button"
            onClick={() => setMobileMenuOpen((prev) => !prev)}
            className="drx-button-motion md:hidden flex min-h-[44px] min-w-[44px] items-center justify-center px-2 text-[14px] text-text-primary hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
            aria-expanded={mobileMenuOpen}
            aria-controls="marketing-mobile-menu"
            aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
          >
            {mobileMenuOpen ? (
              <X className="size-5" />
            ) : (
              <span className="font-normal text-[14px]">Menu</span>
            )}
          </button>

          <Link
            href={appWaitlistUrl}
            data-motion="button"
            className="drx-button-motion flex min-h-[44px] min-w-[44px] items-center justify-center rounded-[6px] bg-accent px-4 py-2 text-[14px] font-medium text-primary-foreground hover:opacity-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            {marketingContent.hero.primaryCta.label}
          </Link>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <nav id="marketing-mobile-menu" aria-label="Mobile navigation" className="md:hidden max-h-[70dvh] overflow-y-auto border-t border-border bg-background px-5 py-4 space-y-1">
          {navLinks.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="flex min-h-[44px] items-center px-3 text-[16px] text-text-primary hover:text-accent transition-colors rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
            >
              {link.label}
            </Link>
          ))}
        </nav>
      )}
    </header>
  );
}
