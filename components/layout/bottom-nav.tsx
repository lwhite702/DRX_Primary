"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MoreHorizontal, Settings } from "lucide-react";
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

// Center Sales with 2 items on each side
const salesItem = primaryNav.find((item) => item.href === "/sales");
const otherItems = primaryNav.filter((item) => item.href !== "/sales");
const navItems = [
  otherItems[0], // Dashboard
  otherItems[1], // Inventory
  salesItem, // Sales (CENTER)
  otherItems[2], // Customers
  otherItems[3], // Credit
].filter(Boolean);
const moreNav = primaryNav.slice(5);

export function BottomNav() {
  const pathname = usePathname();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  return (
    <nav
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80",
        "pb-[env(safe-area-inset-bottom)]",
      )}
      aria-label="Primary navigation"
    >
      <div className="flex items-stretch">
        {navItems.map((item, index) => {
          if (!item) return null;
          const Icon = item.icon;
          const isActive =
            pathname === item.href || pathname.startsWith(item.href + "/");
          const isSales = item.href === "/sales";

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 min-w-0 flex flex-col items-center justify-center gap-1 font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent active:scale-95",
                isSales ? "relative -top-5" : "h-14 px-2",
                !isSales &&
                  (isActive ? "text-accent" : "text-muted-foreground"),
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <div
                className={cn(
                  "flex items-center justify-center transition-all duration-300",
                  isSales
                    ? "h-14 w-14 rounded-full bg-primary shadow-[0_4px_10px_rgba(0,0,0,0.5)] border-4 border-muted"
                    : "",
                  isSales && isActive ? "scale-110 shadow-primary/25" : "",
                )}
              >
                <Icon
                  className={cn(
                    isSales ? "h-6 w-6 text-primary-foreground" : "h-5 w-5",
                  )}
                />
              </div>
              <span
                className={cn(
                  "truncate text-[10px]",
                  isSales ? "font-semibold mt-1" : "text-xs",
                  isSales && isActive ? "text-primary" : "",
                )}
              >
                {item.label}
              </span>
            </Link>
          );
        })}

        <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex-1 min-w-0 h-14 px-2 flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                "active:scale-95 transition-transform",
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
                          : "text-foreground hover:bg-border",
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

                {/* Version */}
                <div className="pt-4 pb-2">
                  <p className="text-xs text-muted-foreground text-center">
                    v0.3.1
                  </p>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
