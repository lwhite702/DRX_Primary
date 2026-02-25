"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";

const publicRoutes = ["/login", "/privacy", "/terms", "/accessibility"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));
  const authBypassEnabled = process.env.NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING === "true";

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <div className="flex flex-1 min-w-0 md:p-4">
        <div className="flex min-w-0 flex-1 md:overflow-hidden md:rounded-2xl md:border md:border-border md:bg-muted">
          <div className="hidden self-stretch md:block">
          <Sidebar />
          </div>

          <main className="flex min-w-0 flex-1 flex-col bg-background md:bg-background/80">
            {authBypassEnabled ? (
              <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold tracking-wide text-amber-100">
                BYPASS MODE ACTIVE: Authentication is disabled for local testing. Do not use for production validation.
              </div>
            ) : null}
            <TopNav />
            <div
              id="main-content"
              key={pathname}
              className={
                "min-w-0 flex-1 overflow-auto animate-in fade-in slide-in-from-bottom-2 duration-300 " +
                "pb-20 md:pb-0 safe-bottom"
              }
            >
              {children}
            </div>
          </main>
        </div>
      </div>

      <div className="hidden md:block">
        <Footer />
      </div>

      <div className="md:hidden">
        <BottomNav />
      </div>
    </div>
  );
}
