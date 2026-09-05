"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ShieldAlert, LayoutDashboard, Building2, Users, Activity, Flag, Bot } from "lucide-react";
import { LogoutButton } from "@/components/layout/logout-button";

const navigation = [
  { path: "", label: "Platform overview", icon: LayoutDashboard },
  { path: "/businesses", label: "Business registry", icon: Building2 },
  { path: "/users", label: "Business memberships", icon: Users },
  { path: "/audit", label: "Platform audit", icon: Activity },
  { path: "/ai", label: "AI operations", icon: Bot },
  { path: "/features", label: "Feature rollouts", icon: Flag },
];

export function PlatformShell({ basePath, children }: {
  basePath: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-background text-foreground">
      <header className="z-50 shrink-0 border-b border-red-950 bg-red-700 px-4 py-3 text-white" aria-label="Platform administration warning">
        <div className="flex items-start gap-3">
          <ShieldAlert className="mt-0.5 size-6 shrink-0" aria-hidden="true" />
          <div>
            <p className="font-bold tracking-wide">PLATFORM ADMINISTRATION</p>
            <p className="text-sm">DRX platform scope — not a business workspace. Business access is separate.</p>
          </div>
        </div>
      </header>
      <a href="#platform-content" className="sr-only focus:not-sr-only focus:bg-red-700 focus:p-3 focus:text-white">Skip to platform content</a>
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <aside className="shrink-0 border-b border-border bg-muted/40 md:w-64 md:overflow-y-auto md:border-b-0 md:border-r" aria-label="Platform navigation sidebar">
          <p className="hidden px-5 py-5 text-sm font-semibold md:block">DRX · Platform console</p>
          <nav aria-label="Platform navigation" className="flex gap-1 overflow-x-auto p-2 md:flex-col md:p-3">
            {navigation.map(({ path, label, icon: Icon }) => {
              const href = `${basePath}${path}`;
              const active = pathname === href;
              return <Link key={path} href={href} prefetch={false} aria-current={active ? "page" : undefined}
                className={`flex min-h-11 shrink-0 items-center gap-2 rounded-lg px-3 py-2 text-sm focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-500 ${active ? "bg-red-700 text-white" : "hover:bg-muted"}`}>
                <Icon className="size-4" aria-hidden="true" />{label}
              </Link>;
            })}
          </nav>
          <div className="flex items-center gap-3 border-t border-border p-3 md:flex-col md:items-stretch">
            <Link href="/dashboard" prefetch={false} className="min-h-11 rounded-lg px-3 py-2 text-sm underline">Leave platform console</Link>
            <LogoutButton />
          </div>
        </aside>
        <main id="platform-content" tabIndex={-1} className="min-h-0 min-w-0 flex-1 overflow-y-auto p-4 md:p-8">{children}</main>
      </div>
    </div>
  );
}
