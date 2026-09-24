"use client";

import * as React from "react";
import { usePathname } from "next/navigation";

import { Sidebar } from "@/components/layout/sidebar";
import { TopNav } from "@/components/layout/top-nav";
import { Footer } from "@/components/layout/footer";
import { BottomNav } from "@/components/layout/bottom-nav";
import { NativeAppBanner } from "@/components/layout/native-app-banner";
import { PWAUpdatePrompt } from "@/components/pwa/pwa-update-prompt";
import { useIsBypassActive } from "@/lib/adapters/auth/ui";

const publicRoutes = ["/login", "/privacy", "/terms", "/accessibility"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route));
  const authBypassEnabled = useIsBypassActive();

  if (isPublic) {
    return <>{children}</>;
  }

  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <div className="flex flex-1 min-w-0">
        <div className="flex min-w-0 flex-1">
          <div className="hidden self-stretch md:block">
            <Sidebar />
          </div>

          <main className="flex min-w-0 flex-1 flex-col bg-background">
            {authBypassEnabled ? (
              <div className="border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-xs font-semibold tracking-wide text-amber-100">
                BYPASS MODE ACTIVE: Authentication is disabled for local testing. Do not use for production validation.
              </div>
            ) : null}
            <TopNav />
            <NativeAppBanner />
            <div
              id="main-content"
              className="min-w-0 flex-1 overflow-auto pb-24 md:pb-0 safe-bottom route-content-transition"
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

      <PWAUpdatePrompt />
    </div>
  );
}
