import Link from "next/link";

import { marketingContent } from "@/lib/marketing-content";

export function SiteFooter() {
  const footer = marketingContent.footer;

  return (
    <footer className="mt-12 border-t border-white/10 bg-black/40">
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="md:col-span-2">
            <p className="text-lg font-bold text-white">Deelrx CRM</p>
            <p className="mt-3 text-sm text-text-secondary">{footer.about}</p>
            <p className="mt-3 text-xs text-text-muted">{footer.disclaimer}</p>
          </div>

          <div>
            <p className="text-xs font-mono uppercase tracking-[0.22em] text-accent">Menu</p>
            <div className="mt-3 space-y-2 text-sm">
              {footer.menuLinks.map((link) => (
                <Link key={link.label} href={link.href} className="block text-text-secondary hover:text-accent">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>

          <div>
            <p className="text-xs font-mono uppercase tracking-[0.22em] text-accent">Resources</p>
            <div className="mt-3 space-y-2 text-sm">
              {footer.resourceLinks.map((link) => (
                <Link key={link.label} href={link.href} className="block text-text-secondary hover:text-accent">
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap items-center gap-4 border-t border-white/10 pt-5 text-xs text-text-secondary">
          <a href={`mailto:${footer.contact}`} className="hover:text-accent">
            {footer.contact}
          </a>
          {footer.legalLinks.map((link) => (
            <Link key={link.label} href={link.href} className="hover:text-accent">
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
