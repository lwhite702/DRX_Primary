"use client";

import Link from "next/link";
import { drxContent } from "@deelrx/content";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Package,
  ScanLine,
  ShoppingCart,
  MoreHorizontal,
  Users,
  Wallet,
  Truck,
  LineChart,
  BarChart2,
  Settings,
  SlidersHorizontal,
  Tag,
  Shield,
  HelpCircle,
  Building2,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

import { cn } from "@/lib/utils";
import { LogoutButton } from "@/components/layout/logout-button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { docsHubUrl } from "@/lib/docs-links";
import { useBusiness } from "@/lib/hooks/use-business";
import { usePermission } from "@/lib/hooks/use-permission";
import { SentryFeedbackButton } from "@/components/sentry-feedback-button";

export function BottomNav() {
  const pathname = usePathname();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const { business, availableBusinesses, switchBusiness } = useBusiness();
  const { hasPermission } = usePermission(business?.id);

  const isDashboardActive =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");
  const isInventoryActive =
    pathname === "/inventory" || pathname.startsWith("/inventory/");
  const isPosActive = pathname === "/pos" || pathname.startsWith("/pos/");
  const isSalesActive = pathname === "/sales" || pathname.startsWith("/sales/");

  const canManageTeam = hasPermission("staff.manage");
  const canManageInventory = hasPermission("inventory.manage");
  const canConfigurePos = hasPermission("settings.configure_pos");

  const moreActive =
    pathname.startsWith("/customers") ||
    pathname.startsWith("/credit") ||
    pathname.startsWith("/deliveries") ||
    pathname.startsWith("/insights") ||
    pathname.startsWith("/reports") ||
    pathname.startsWith("/settings");

  return (
    <nav
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border/80 bg-background/95 backdrop-blur-xl supports-[backdrop-filter]:bg-background/80 shadow-[0_-4px_20px_rgba(0,0,0,0.4)]",
        "pb-[env(safe-area-inset-bottom)]",
      )}
      aria-label="Mobile navigation"
    >
      <div className="relative flex items-center justify-around h-16 px-1 max-w-lg mx-auto">
        {/* 1. Dashboard */}
        <Link
          href="/dashboard"
          className={cn(
            "flex-1 min-w-[56px] min-h-[44px] flex flex-col items-center justify-center gap-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg active:scale-95",
            isDashboardActive
              ? "text-accent"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-current={isDashboardActive ? "page" : undefined}
          aria-label="Home"
        >
          <LayoutDashboard className="h-5 w-5" />
          <span className="text-[11px] font-medium tracking-tight">Home</span>
        </Link>

        {/* 2. Inventory */}
        <Link
          href="/inventory"
          className={cn(
            "flex-1 min-w-[56px] min-h-[44px] flex flex-col items-center justify-center gap-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg active:scale-95",
            isInventoryActive
              ? "text-accent"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-current={isInventoryActive ? "page" : undefined}
          aria-label="Products"
        >
          <Package className="h-5 w-5" />
          <span className="text-[11px] font-medium tracking-tight">
            Products
          </span>
        </Link>

        {/* 3. Center POS Hero (Raised Action Button) */}
        <div className="flex-1 min-w-[64px] flex flex-col items-center justify-center">
          <Link
            href="/pos/sale"
            className={cn(
              "relative flex flex-col items-center justify-center group focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-full",
              "active:scale-95 transition-transform duration-150",
            )}
            aria-current={isPosActive ? "page" : undefined}
            aria-label="New sale"
          >
            <div
              className={cn(
                "h-10 w-12 rounded-2xl bg-accent text-black flex items-center justify-center  transition-all duration-200",
                isPosActive
                  ? "scale-105 ring-2 ring-accent"
                  : "group-hover:scale-105",
              )}
            >
              <ScanLine className="h-6 w-6 stroke-[2.5]" />
            </div>
            <span
              className={cn(
                "text-[11px] font-medium mt-0.5",
                isPosActive ? "text-accent" : "text-muted-foreground",
              )}
            >
              {drxContent.navigation.newSale}
            </span>
          </Link>
        </div>

        {/* 4. Orders & Receipts */}
        <Link
          href="/sales"
          className={cn(
            "flex-1 min-w-[56px] min-h-[44px] flex flex-col items-center justify-center gap-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg active:scale-95",
            isSalesActive
              ? "text-accent"
              : "text-muted-foreground hover:text-foreground",
          )}
          aria-current={isSalesActive ? "page" : undefined}
          aria-label={drxContent.navigation.sales}
        >
          <ShoppingCart className="h-5 w-5" />
          <span className="text-[11px] font-medium tracking-tight">{drxContent.navigation.sales}</span>
        </Link>

        {/* 5. More Drawer */}
        <Sheet open={moreMenuOpen} onOpenChange={setMoreMenuOpen}>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex-1 min-w-[56px] min-h-[44px] flex flex-col items-center justify-center gap-1 font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded-lg active:scale-95",
                moreActive || moreMenuOpen
                  ? "text-accent"
                  : "text-muted-foreground hover:text-foreground",
              )}
              aria-label="More navigation options"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="text-[11px] font-medium tracking-tight">
                More
              </span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="flex flex-col rounded-t-2xl p-0 max-h-[88dvh] overflow-hidden border-t border-border/80 bg-card"
          >
            <SheetHeader className="shrink-0 px-5 py-4 border-b border-border/60 flex flex-row items-center justify-between">
              <div>
                <SheetTitle className="text-base font-semibold">
                  {drxContent.navigation.more}
                </SheetTitle>
                {business && (
                  <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5">
                    <Building2 className="w-3.5 h-3.5 text-accent" />
                    {business.business_name}
                  </p>
                )}
              </div>
            </SheetHeader>

            <div className="min-h-0 p-4 overflow-y-auto overscroll-contain space-y-5 pb-[max(2.5rem,env(safe-area-inset-bottom))]">
              {/* Operations Section */}
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-1.5">
                  Operations
                </p>
                <div className="grid grid-cols-1 gap-1">
                  <Link
                    href="/customers"
                    onClick={() => setMoreMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors",
                      pathname.startsWith("/customers")
                        ? "bg-accent/15 text-accent font-semibold"
                        : "text-foreground hover:bg-muted active:bg-muted/80",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Users className="h-4 w-4" />
                      <span>Customers</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                  </Link>

                  <Link
                    href="/credit"
                    onClick={() => setMoreMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors",
                      pathname.startsWith("/credit")
                        ? "bg-accent/15 text-accent font-semibold"
                        : "text-foreground hover:bg-muted active:bg-muted/80",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Wallet className="h-4 w-4" />
                      <span>Payments</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                  </Link>

                  <Link
                    href="/deliveries"
                    onClick={() => setMoreMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors",
                      pathname.startsWith("/deliveries")
                        ? "bg-accent/15 text-accent font-semibold"
                        : "text-foreground hover:bg-muted active:bg-muted/80",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Truck className="h-4 w-4" />
                      <span>Deliveries</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                  </Link>

                  <Link
                    href="/insights"
                    onClick={() => setMoreMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors",
                      pathname.startsWith("/insights")
                        ? "bg-accent/15 text-accent font-semibold"
                        : "text-foreground hover:bg-muted active:bg-muted/80",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <LineChart className="h-4 w-4" />
                      <span>{drxContent.navigation.trends}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                  </Link>

                  <Link
                    href="/reports"
                    onClick={() => setMoreMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors",
                      pathname.startsWith("/reports")
                        ? "bg-accent/15 text-accent font-semibold"
                        : "text-foreground hover:bg-muted active:bg-muted/80",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <BarChart2 className="h-4 w-4" />
                      <span>{drxContent.navigation.reports}</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                  </Link>
                </div>
              </div>

              {/* Settings & Administration Section */}
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-1.5">
                  Settings & Management
                </p>
                <div className="grid grid-cols-1 gap-1">
                  <Link
                    href="/settings"
                    onClick={() => setMoreMenuOpen(false)}
                    className={cn(
                      "flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors",
                      pathname === "/settings"
                        ? "bg-accent/15 text-accent font-semibold"
                        : "text-foreground hover:bg-muted active:bg-muted/80",
                    )}
                  >
                    <div className="flex items-center gap-3">
                      <Settings className="h-4 w-4" />
                      <span>Business Settings</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                  </Link>

                  {canConfigurePos && (
                    <Link
                      href="/settings/commerce"
                      onClick={() => setMoreMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors",
                        pathname.startsWith("/settings/commerce")
                          ? "bg-accent/15 text-accent font-semibold"
                          : "text-foreground hover:bg-muted active:bg-muted/80",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <SlidersHorizontal className="h-4 w-4" />
                        <span>Commerce & Delivery</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </Link>
                  )}

                  {canManageInventory && (
                    <Link
                      href="/settings/inventory/aliases"
                      onClick={() => setMoreMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors",
                        pathname.startsWith("/settings/inventory/aliases")
                          ? "bg-accent/15 text-accent font-semibold"
                          : "text-foreground hover:bg-muted active:bg-muted/80",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Tag className="h-4 w-4" />
                        <span>Manage Aliases</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </Link>
                  )}

                  {canManageTeam && (
                    <Link
                      href="/settings/team"
                      onClick={() => setMoreMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors",
                        pathname.startsWith("/settings/team")
                          ? "bg-accent/15 text-accent font-semibold"
                          : "text-foreground hover:bg-muted active:bg-muted/80",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Users className="h-4 w-4" />
                        <span>Manage Team</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </Link>
                  )}

                  {hasPermission("audit.view") && <Link href="/settings/audit" onClick={() => setMoreMenuOpen(false)} className="block min-h-11 rounded-xl px-3.5 py-2.5 text-sm hover:bg-muted">Business audit</Link>}

                  {canManageInventory && (
                    <Link
                      href="/inventory/approvals"
                      onClick={() => setMoreMenuOpen(false)}
                      className={cn(
                        "flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors",
                        pathname.startsWith("/inventory/approvals")
                          ? "bg-accent/15 text-accent font-semibold"
                          : "text-foreground hover:bg-muted active:bg-muted/80",
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Shield className="h-4 w-4" />
                        <span>Inventory approvals</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </Link>
                  )}
                </div>
              </div>

              {/* Support & Feedback Section */}
              <div className="space-y-1">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-1.5">
                  Support & Help
                </p>
                <div className="grid grid-cols-1 gap-1">
                  <Link
                    href={docsHubUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={() => setMoreMenuOpen(false)}
                    className="flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium text-foreground hover:bg-muted active:bg-muted/80 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <HelpCircle className="h-4 w-4" />
                      <span>Help Center & Docs</span>
                    </div>
                    <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                  </Link>

                  <SentryFeedbackButton
                    asChild
                    source="mobile_more_drawer"
                    placeholder="Found a bug? Let us know what happened."
                  >
                    <button
                      type="button"
                      className="w-full flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium text-foreground hover:bg-muted active:bg-muted/80 transition-colors text-left"
                    >
                      <div className="flex items-center gap-3">
                        <svg
                          className="h-4 w-4 text-muted-foreground"
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
                        <span>Report a Bug</span>
                      </div>
                      <ChevronRight className="h-4 w-4 text-muted-foreground/60" />
                    </button>
                  </SentryFeedbackButton>
                </div>
              </div>

              {/* Businesses & Switcher if multiple */}
              {availableBusinesses && availableBusinesses.length > 1 && (
                <div className="space-y-1">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground px-3 mb-1.5">
                    Switch Business
                  </p>
                  <div className="grid grid-cols-1 gap-1">
                    {availableBusinesses.map((b: any) => {
                      const isCurrent =
                        business?.clerkOrgId === b.id || business?.id === b.id;
                      return (
                        <button
                          key={b.id}
                          type="button"
                          onClick={() => {
                            switchBusiness(b.id);
                            setMoreMenuOpen(false);
                          }}
                          className={cn(
                            "flex items-center justify-between px-3.5 py-2.5 min-h-[44px] rounded-xl text-sm font-medium transition-colors text-left",
                            isCurrent
                              ? "bg-accent/15 text-accent font-semibold border border-accent/20"
                              : "text-foreground hover:bg-muted active:bg-muted/80",
                          )}
                        >
                          <div className="flex items-center gap-3">
                            <Building2 className="h-4 w-4" />
                            <span className="truncate">{b.business_name}</span>
                          </div>
                          {isCurrent && (
                            <span className="text-xs font-semibold text-accent uppercase">
                              Active
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Sign Out */}
              <div className="pt-2 border-t border-border/60">
                <LogoutButton className="w-full flex items-center justify-center gap-2 px-4 py-3 min-h-[44px] rounded-xl text-sm font-semibold bg-muted hover:bg-destructive/15 hover:text-destructive text-foreground transition-colors" />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  );
}
