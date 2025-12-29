import { NotificationsPopover } from "@/components/layout/notifications-popover";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Menu, Search, Settings, User, LogOut } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

import { AppLogo } from "@/components/layout/app-logo";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { useBusiness } from "@/lib/hooks/use-business";
import { usePermission } from "@/lib/hooks/use-permission";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { getSupabaseClient } from "@/lib/supabase/client";

export function TopNav() {
  const pathname = usePathname();
  const router = useRouter();
  const { business } = useBusiness();
  const { hasPermission, loading } = usePermission(business?.id);
  const { role } = useUserRole(business?.id);
  const supabase = getSupabaseClient();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogout = async () => {
    if (!supabase) {
      toast.error("Supabase client not available");
      return;
    }

    const { error } = await supabase.auth.signOut();

    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success("Logged out successfully");
    router.push("/login");
    router.refresh();
  };

  const filteredNav = primaryNav.filter((item) => {
    if (loading) return false;

    switch (item.href) {
      case "/settings":
        return hasPermission("settings.manage");
      case "/reports":
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
    hasPermission("system.manage") || hasPermission("users.manage_all");

  return (
    <header className="h-14 md:h-16 bg-muted border-b border-border flex items-center justify-between px-4 md:px-6 gap-3 min-w-0">
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
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
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
                    <span className="min-w-0 truncate">Admin Console</span>
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
                <div
                  onClick={handleLogout}
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-border cursor-pointer"
                >
                  <LogOut className="h-5 w-5" />
                  <span className="min-w-0 truncate">Logout</span>
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Logo */}
      <div className="flex items-center min-w-0 gap-2">
        <div className="max-w-[220px] min-w-0">
          <AppLogo showTagline={false} />
        </div>
        <div className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/20">
          BETA
        </div>
      </div>

      {/* Desktop search */}
      <div className="hidden md:block flex-1 max-w-md">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search..."
            aria-label="Search DRX CRM"
            className="pl-10"
          />
        </div>
      </div>

      <div className="flex items-center gap-1 md:gap-4">
        <Button
          variant="ghost"
          size="icon-lg"
          aria-label="Search"
          className="md:hidden"
        >
          <Search className="w-5 h-5" />
        </Button>

        <NotificationsPopover />

        <div className="flex items-center gap-2">
          <BusinessSwitcher />
          {role && (
            <span className="hidden md:block text-xs font-medium capitalize text-muted-foreground border px-2 py-0.5 rounded-full">
              {role.replace("_", " ")}
            </span>
          )}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon-lg" aria-label="User menu">
                <User className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>My Account</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {showAdminConsole && (
                <DropdownMenuItem asChild>
                  <Link
                    href="/admin"
                    className="flex items-center cursor-pointer"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    <span>Admin Console</span>
                  </Link>
                </DropdownMenuItem>
              )}
              <DropdownMenuItem asChild>
                <Link
                  href="/settings/profile"
                  className="flex items-center cursor-pointer"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile</span>
                </Link>
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={handleLogout}
                className="text-red-600 focus:text-red-600 cursor-pointer"
              >
                <LogOut className="mr-2 h-4 w-4" />
                <span>Logout</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </header>
  );
}
