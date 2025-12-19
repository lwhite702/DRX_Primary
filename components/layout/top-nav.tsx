"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell, Menu, Search, Settings, User } from "lucide-react";

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

export function TopNav() {
  const pathname = usePathname();

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
        <Sheet>
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
                {primaryNav.map((item) => {
                  const Icon = item.icon;
                  const isActive =
                    pathname === item.href ||
                    pathname.startsWith(item.href + "/");

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
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
                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-border"
                >
                  <Settings className="h-5 w-5" />
                  <span className="min-w-0 truncate">Admin Console</span>
                </Link>
                <button
                  onClick={() => {
                    const feedback = (window as any).Sentry?.getFeedback?.();
                    if (feedback) {
                      feedback.createWidget();
                    }
                  }}
                  className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-border"
                >
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
                <LogoutButton className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-border" />
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>

      {/* Logo */}
      <div className="flex items-center min-w-0">
        <div className="max-w-[220px] min-w-0">
          <AppLogo showTagline={false} />
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

        <Button variant="ghost" size="icon-lg" aria-label="Notifications">
          <Bell className="w-5 h-5" />
        </Button>

        <Button variant="ghost" size="icon-lg" aria-label="User menu">
          <User className="w-5 h-5" />
        </Button>
      </div>
    </header>
  );
}
