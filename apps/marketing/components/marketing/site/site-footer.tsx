import Link from "next/link";
import { footerLinks } from "./nav-config";

export function SiteFooter() {
  return (
    <footer className="border-t border-border/50 bg-black/70">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-8 px-6 py-10 md:flex-row md:items-start md:justify-between">
        <div className="max-w-md space-y-3">
          <p className="text-sm font-semibold text-white">Deelrx CRM</p>
          <p className="text-sm text-text-secondary">
            Built for dispensaries all the way down to smaller operators.
          </p>
          <p className="text-xs text-text-muted">
            Trust notes: role-based access, auditable inventory changes, privacy
            presets, and offline queue with reconnect sync.
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 text-sm md:text-right">
          {footerLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="text-text-secondary transition-colors hover:text-neon-lime"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </footer>
  );
}
