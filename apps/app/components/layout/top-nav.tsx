import { NotificationsPopover } from "@/components/layout/notifications-popover";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, ScanLine, Search, Settings } from "lucide-react";
import { useState } from "react";
import { UserButton } from "@/lib/adapters/auth/ui";

import { LogoutButton } from "@/components/layout/logout-button";
import { primaryNav } from "@/components/layout/nav-items";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { SentryFeedbackButton } from "@/components/sentry-feedback-button";
import { BusinessSwitcher } from "@/components/layout/business-switcher";
import { DashboardViewSwitcher } from "@/components/layout/dashboard-view-switcher";
import { useBusiness } from "@/lib/hooks/use-business";
import { usePermission } from "@/lib/hooks/use-permission";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { AppLogo } from "@/components/layout/app-logo";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { business } = useBusiness();
  const { hasPermission, loading } = usePermission(business?.id);
  const { role } = useUserRole(business?.id);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const filteredNav = primaryNav.filter((item) => {
    if (loading) return false;

    switch (item.href) {
      case "/settings":
        return hasPermission("settings.configure_pos");
      case "/reports":
        return (
          hasPermission("reports.view_daily") ||
          hasPermission("reports.view_all")
        );
      case "/inventory":
        return hasPermission("catalog.view");
      case "/sales":
        return hasPermission("sales.create");
      case "/customers":
        return hasPermission("customers.view");
      default:
        return true;
    }
  });

  const showAdminConsole =
    hasPermission("system.manage") || hasPermission("users.manage_all");
  const canQuickSale = !loading && hasPermission("sales.create");
  const showDashboardViewSwitcher =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  return (
    <header className="flex h-14 min-w-0 items-center justify-between gap-3 border-b border-border bg-muted px-4 md:h-16 md:px-6">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-accent focus:text-background focus:p-2 focus:rounded focus:z-50"
      >
        Skip to main content
      </a>

      {/* Mobile menu */}
      <div className="md:hidden">
        <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
          <SheetTrigger asChild>
            <Button
              variant="ghost"
              size="icon-lg"
              aria-label="Open navigation menu"
            >
              <Menu className="h-5 w-5" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="p-0">
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle className="text-left">
                <AppLogo showTagline />
              </SheetTitle>
            </SheetHeader>
            <div className="p-2 overflow-y-auto">
              <nav className="space-y-1" aria-label="Main menu">
                {filteredNav.map((item) => {
                  const Icon = item.icon;
                  const isExternal = Boolean(item.external);
                  const isActive =
                    !isExternal &&
                    (pathname === item.href ||
                      pathname.startsWith(item.href + "/"));

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      target={isExternal ? "_blank" : undefined}
                      rel={isExternal ? "noopener noreferrer" : undefined}
                      onClick={() => setMobileMenuOpen(false)}
                      className={
                        "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-colors " +
                        (isActive
                          ? "bg-accent text-background"
                          : "text-foreground hover:bg-border")
                      }
                      aria-current={isActive ? "page" : undefined}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="min-w-0 truncate">{item.label}</span>
                    </Link>
                  );
                })}
              </nav>

              <div className="mt-3 pt-3 border-t border-border space-y-1">
                {showAdminConsole && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-border"
                  >
                    <Settings className="h-5 w-5" />
                    <span className="min-w-0 truncate">Administration</span>
                  </Link>
                )}
                <SentryFeedbackButton
                  asChild
                  source="navigation"
                  placeholder="Found a bug? Let us know what happened."
                >
                  <button className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-border">
                    <svg
                      className="h-5 w-5"
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
                    <span className="min-w-0 truncate">Report a Bug</span>
                  </button>
                </SentryFeedbackButton>
                <div className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-border cursor-pointer">
                  <LogoutButton className="p-0 flex items-center gap-3" />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Logo */}
      <div className="flex min-w-0 items-center gap-2 md:hidden">
        <div className="max-w-[220px] min-w-0">
          <AppLogo showTagline={false} />
        </div>
        <div className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/20">
          BETA
        </div>
      </div>

      {/* Desktop search */}
      <div className="hidden max-w-md flex-1 md:block">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            aria-label="Search Deelrx CRM"
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 md:ml-auto md:gap-4">
        {canQuickSale ? (
          <Link href="/pos/sale" className="hidden md:block">
            <Button className="bg-accent hover:bg-accent/90 text-black font-semibold">
              <ScanLine className="mr-2 h-4 w-4" />
              Quick Sale
            </Button>
          </Link>
        ) : null}

        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Search"
          className="md:hidden"
        >
          <Search className="w-5 h-5" />
        </Button>

        <NotificationsPopover />

        {canQuickSale ? (
          <Link href="/pos/sale" className="md:hidden">
            <Button
              variant="outline"
              size="icon-lg"
              aria-label="Open Quick Sale"
              className="border-accent/40 text-accent hover:bg-accent/10"
            >
              <ScanLine className="w-5 h-5" />
            </Button>
          </Link>
        ) : null}

        <div className="flex items-center gap-2">
          {showDashboardViewSwitcher ? <DashboardViewSwitcher /> : null}
          <BusinessSwitcher />
          {role && (
            <span className="hidden md:block text-xs font-medium capitalize text-muted-foreground border px-2 py-0.5 rounded-full">
              {role.replace("_", " ")}
            </span>
          )}

          <UserButton
            afterSignOutUrl="/login"
            appearance={{
              elements: {
                userButtonAvatarBox: "w-9 h-9",
              },
            }}
          >
            {showAdminConsole && (
              <UserButton.MenuItems>
                <UserButton.Action
                  label="Administration"
                  labelIcon={<Settings className="w-4 h-4" />}
                  onClick={() => router.push("/admin")}
                />
              </UserButton.MenuItems>
            )}
          </UserButton>
        </div>
      </div>
    </header>
  );
}
