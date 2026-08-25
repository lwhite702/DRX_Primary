import { NotificationsPopover } from "@/components/layout/notifications-popover";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { ScanLine, Search, Settings } from "lucide-react";
import { UserButton } from "@/lib/adapters/auth/ui";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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

  const showAdminConsole =
    hasPermission("system.manage") || hasPermission("users.manage_all");
  // Default to true while loading to prevent layout shifts
  const canQuickSale = loading || hasPermission("sales.create");
  const showDashboardViewSwitcher =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/");

  return (
    <header className="flex h-14 min-w-0 items-center justify-between gap-2 border-b border-border bg-muted/80 backdrop-blur px-3 md:h-16 md:px-6">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:absolute focus:top-2 focus:left-2 focus:bg-accent focus:text-background focus:p-2 focus:rounded focus:z-50"
      >
        Skip to main content
      </a>

      {/* Brand Logo & Beta badge on Mobile */}
      <div className="flex min-w-0 items-center gap-2">
        <Link href="/dashboard" className="flex items-center gap-2 min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent rounded">
          <div className="max-w-[140px] sm:max-w-[200px] min-w-0">
            <AppLogo showTagline={false} />
          </div>
          <div className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-1.5 py-0.5 rounded border border-amber-500/20">
            BETA
          </div>
        </Link>
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

      {/* Right controls */}
      <div className="flex items-center gap-1.5 md:gap-3">
        {canQuickSale ? (
          <Link href="/pos/sale" className="hidden md:block">
            <Button className="bg-accent hover:bg-accent/90 text-black font-semibold">
              <ScanLine className="mr-2 h-4 w-4" />
              Quick Sale
            </Button>
          </Link>
        ) : null}

        <NotificationsPopover />

        <div className="flex items-center gap-1.5 md:gap-2">
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
                userButtonAvatarBox: "w-8 h-8 md:w-9 md:h-9",
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

