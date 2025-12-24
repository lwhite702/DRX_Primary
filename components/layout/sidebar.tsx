"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Settings } from "lucide-react";

import { primaryNav } from "@/components/layout/nav-items";
import { LogoutButton } from "@/components/layout/logout-button";
import { AppLogo } from "@/components/layout/app-logo";

import { useBusiness } from "@/lib/hooks/use-business";
import { usePermission } from "@/lib/hooks/use-permission";

export function Sidebar() {
  const pathname = usePathname();
  const { business } = useBusiness();
  const { hasPermission, loading } = usePermission(business?.id);

  // Filter nav items
  const filteredNav = primaryNav.filter((item) => {
    // If loading, maintain current state or show all?
    // To prevent flicker, we might want to show all initially or hide sensitive ones.
    // But since authentication is required, default to hidden for restricted is safer.
    if (loading) return false;

    switch (item.href) {
      case "/settings":
        return hasPermission("settings.manage");
      case "/reports":
        // Cashier cannot access reports (per prompt)
        return (
          hasPermission("reports.view_daily") ||
          hasPermission("reports.view_all")
        );
      case "/inventory":
        return hasPermission("catalog.view");
      case "/sales":
        return hasPermission("sales.create") || hasPermission("sales.view_all");
      case "/customers":
        return hasPermission("customers.view");
      default:
        return true;
    }
  });

  const showAdminConsole =
    hasPermission("system.manage") || hasPermission("users.manage_all"); // Super admin permissions

  return (
    <aside
      className="w-64 bg-muted border-r border-border flex flex-col"
      role="complementary"
      aria-label="Main navigation sidebar"
    >
      <div className="p-6 border-b border-border">
        <AppLogo showTagline />
      </div>

      <nav
        className="flex-1 overflow-y-auto p-4 space-y-2"
        aria-label="Main menu"
      >
        {filteredNav.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
                (isActive
                  ? "bg-accent text-background"
                  : "text-foreground hover:bg-border")
              }
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        {showAdminConsole && (
          <Link
            href="/admin"
            className="flex items-center gap-3 px-4 py-2 rounded-lg text-foreground hover:bg-border transition-colors text-sm font-medium"
          >
            <Settings className="w-5 h-5" />
            Admin Console
          </Link>
        )}
        <button
          onClick={() => {
            const feedback = (window as any).Sentry?.getFeedback?.();
            if (feedback) {
              feedback.createWidget();
            }
          }}
          className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-foreground hover:bg-border transition-colors text-sm font-medium"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          Report a Bug
        </button>
        <LogoutButton />
      </div>
    </aside>
  );
}
