import Link from "next/link";
import { BrandMark } from "./brand-mark";
import { appLoginUrl } from "@/lib/app-links";

const footerLinks = [
  { label: "Product", href: "/product" },
  { label: "Privacy", href: "/legal/privacy" },
  { label: "Accessibility", href: "/legal/lawful-use" },
  { label: "FAQ", href: "#faq" },
  { label: "Sign in", href: appLoginUrl },
];

export function MarketingFooter() {
  return (
    <footer
      className="w-full border-t border-border pt-8 pb-10 text-left"
      aria-label="Site Footer"
    >
      <div className="flex flex-col gap-6">
        {/* Top row: Brand & Destinations */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <BrandMark variant="wordmark" />

          <nav
            className="flex flex-wrap items-center gap-1 sm:gap-2 -ml-2 sm:ml-0"
            aria-label="Footer destinations"
          >
            {footerLinks.map((link) => (
              <Link
                key={link.label}
                href={link.href}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center px-2 sm:px-3 text-[14px] font-normal leading-[20px] text-text-primary hover:text-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-md"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </div>

        {/* Bottom row: Legal Line */}
        <div className="pt-2">
          <p className="text-[12px] font-medium leading-[16px] text-muted-foreground tracking-[0.1px]">
            © 2026 DRX ·{" "}
            <Link
              href="/legal/lawful-use"
              className="hover:text-text-primary hover:underline"
            >
              Use lawfully
            </Link>{" "}
            ·{" "}
            <Link
              href="/legal/privacy"
              className="hover:text-text-primary hover:underline"
            >
              Privacy
            </Link>{" "}
            ·{" "}
            <Link
              href="/legal/terms"
              className="hover:text-text-primary hover:underline"
            >
              Terms
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
