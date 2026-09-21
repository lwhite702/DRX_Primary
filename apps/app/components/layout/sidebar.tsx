"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { primaryNav } from "@/components/layout/nav-items";
import { LogoutButton } from "@/components/layout/logout-button";
import { AppLogo } from "@/components/layout/app-logo";

import { useBusiness } from "@/lib/hooks/use-business";
import { usePermission } from "@/lib/hooks/use-permission";
import { docsHubUrl } from "@/lib/docs-links";
import { openFeedbackWithFallback } from "@/lib/feedback";

export function Sidebar() {
  const pathname = usePathname();
  const { business } = useBusiness();
  const { hasPermission, loading } = usePermission(business?.id);

  // Filter nav items
  const filteredNav = primaryNav.filter((item) => {
    // Keep nav visible while permissions loading to prevent nav collapse
    if (loading) return true;

    switch (item.href) {
      case "/settings":
        return hasPermission("settings.configure_pos");
      case "/reports":
        // Cashier cannot access reports (per prompt)
        return (
          hasPermission("reports.view_daily") ||
          hasPermission("reports.view_all")
        );
      case "/inventory":
        return hasPermission("catalog.view");
      case "/sales":
        return hasPermission("sales.create");
      case "/pos/sale":
        return hasPermission("sales.create");
      case "/customers":
        return hasPermission("customers.view");
      default:
        return true;
    }
  });

  const showBusinessTeam = hasPermission("staff.manage");

  return (
    <aside
      className="sticky top-0 flex h-dvh w-52 lg:w-60 flex-col border-r border-border bg-surface"
      role="complementary"
      aria-label="Main navigation sidebar"
    >
      <div className="border-b border-border px-5 py-4">
        <div className="flex flex-col items-start gap-2">
          <AppLogo showTagline size="sidebar" />
          <div className="rounded border border-amber-500/20 bg-amber-500/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-amber-500">
            Beta
          </div>
        </div>
      </div>

      <nav
        className="flex-1 overflow-y-auto p-3 space-y-1"
        aria-label="Main menu"
      >
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isExternal = Boolean(item.external);
          const isActive =
            !isExternal &&
            (pathname === item.href || pathname.startsWith(item.href + "/"));

          return (
            <Link
              key={item.href}
              href={item.href}
              target={isExternal ? "_blank" : undefined}
              rel={isExternal ? "noopener noreferrer" : undefined}
              className={
                "flex items-center gap-3 min-h-11 px-3 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
                (isActive
                  ? "bg-surface-elevated text-accent"
                  : "text-foreground hover:bg-border")
              }
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-5 h-5 shrink-0" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        {hasPermission("inventory.manage") && <Link href="/inventory/approvals" className="block rounded-lg min-h-11 px-3 py-2 text-sm hover:bg-border">Inventory approvals</Link>}
        {hasPermission("audit.view") && <Link href="/settings/audit" className="block rounded-lg min-h-11 px-3 py-2 text-sm hover:bg-border">Business audit</Link>}
        {showBusinessTeam && (
          <Link
            href="/settings/team"
            className="flex items-center gap-3 min-h-11 px-3 py-2 rounded-lg text-foreground hover:bg-border transition-colors text-sm font-medium"
          >
            <Settings className="w-5 h-5 shrink-0" />
            Business team
          </Link>
        )}
        <Link
          href={docsHubUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-3 min-h-11 px-3 py-2 rounded-lg text-foreground hover:bg-border transition-colors text-sm font-medium"
        >
          <svg
            className="w-5 h-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Help Center
        </Link>
        <button
          onClick={() => {
            const feedback = (window as any).Sentry?.getFeedback?.();
            void openFeedbackWithFallback(
              feedback ? () => feedback.createWidget() : null,
            );
          }}
          className="w-full flex items-center gap-3 min-h-11 px-3 py-2 rounded-lg text-foreground hover:bg-border transition-colors text-sm font-medium"
        >
          <svg
            className="w-5 h-5 shrink-0"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
          Report a Bug
        </button>
        <LogoutButton />

      </div>
    </aside>
  );
}
