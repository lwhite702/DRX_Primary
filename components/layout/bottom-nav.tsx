"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, Settings, DollarSign } from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { primaryNav } from "@/components/layout/nav-items";
import { LogoutButton } from "@/components/layout/logout-button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";

// Split nav: first 2, Sales (center FAB), last 2
const leftNav = primaryNav.slice(0, 2);
const salesItem = primaryNav.find((item) => item.href === "/sales");
const rightNav = primaryNav
  .slice(2, 4)
  .filter((item) => item.href !== "/sales");
const moreNav = primaryNav.slice(4);

export function BottomNav() {
  const pathname = usePathname();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  const isSalesActive = pathname === "/sales" || pathname.startsWith("/sales/");

  return (
    <nav
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80",
        "pb-[env(safe-area-inset-bottom)]"
      )}
      aria-label="Primary navigation"
    >
      <div className="flex items-stretch justify-around relative">
        {/* Left Nav Items */}
        {leftNav.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 min-w-0 h-14 px-2 flex flex-col items-center justify-center gap-1 text-xs font-medium",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                "active:scale-95 transition-transform",
                isActive ? "text-accent" : "text-muted-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        {/* Sales FAB - Prominent Center Button */}
        {salesItem && (
          <Link
            href={salesItem.href}
            className={cn(
              "flex-1 min-w-0 h-14 px-2 flex flex-col items-center justify-center relative",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              "active:scale-95 transition-all"
            )}
            aria-current={isSalesActive ? "page" : undefined}
          >
            {/* FAB Circle */}
            <div
              className={cn(
                "absolute -top-4 w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all",
                isSalesActive
                  ? "bg-accent scale-110"
                  : "bg-green-600 hover:bg-green-700 hover:scale-105"
              )}
            >
              <DollarSign className="h-7 w-7 text-white" />
            </div>
            {/* Label */}
            <span
              className={cn(
                "text-xs font-bold mt-6",
                isSalesActive ? "text-accent" : "text-green-600"
              )}
            >
              {salesItem.label}
            </span>
          </Link>
        )}

        {/* Right Nav Items */}
        {rightNav.map((item) => {
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 min-w-0 h-14 px-2 flex flex-col items-center justify-center gap-1 text-xs font-medium",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                "active:scale-95 transition-transform",
                isActive ? "text-accent" : "text-muted-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}

        {/* More Menu */}
        <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex-1 min-w-0 h-14 px-2 flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                "active:scale-95 transition-transform"
              )}
              aria-label="More navigation"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="truncate">More</span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-xl p-0 max-h-[85vh] overflow-hidden"
          >
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="p-2 overflow-y-auto">
              <div className="space-y-1">
                {moreNav.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={() => setMoreMenuOpen(false)}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
                        isActive
                          ? "bg-accent text-background"
                          : "text-foreground hover:bg-border"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="min-w-0 truncate">{item.label}</span>
                    </Link>
                  );
                })}

                <Link
                  href="/admin"
                  onClick={() => setMoreMenuOpen(false)}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-border"
                >
                  <Settings className="h-5 w-5" />
                  <span className="min-w-0 truncate">Admin Console</span>
                </Link>

                <div className="pt-2">
                  <LogoutButton className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-border" />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
