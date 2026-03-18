"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { HELP_SECTION_ROUTES } from "@/lib/help/support-center";

const staticLinks = [
  { href: "/help", label: "Overview" },
  { href: "/help/library", label: "Library" },
] as const;

export function HelpSectionNav() {
  const pathname = usePathname();

  const links = [
    staticLinks[0],
    ...HELP_SECTION_ROUTES.map((section) => ({
      href: section.href,
      label: section.label,
    })),
    staticLinks[1],
  ];

  return (
    <nav aria-label="Support center sections" className="rounded-xl border border-white/10 bg-muted/20 p-2">
      <div className="flex flex-wrap gap-2">
        {links.map((link) => {
          const isActive =
            pathname === link.href ||
            (link.href !== "/help" && pathname.startsWith(link.href + "/"));

          return (
            <Link
              key={link.href}
              href={link.href}
              className={
                "rounded-md px-3 py-1.5 text-xs font-medium transition-colors " +
                (isActive
                  ? "bg-accent text-black"
                  : "text-muted-foreground hover:bg-background hover:text-foreground")
              }
              aria-current={isActive ? "page" : undefined}
            >
              {link.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
