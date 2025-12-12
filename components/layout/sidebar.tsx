"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Settings } from "lucide-react"

import { primaryNav } from "@/components/layout/nav-items"
import { LogoutButton } from "@/components/layout/logout-button"
import { AppLogo } from "@/components/layout/app-logo"

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside
      className="w-64 bg-muted border-r border-border flex flex-col"
      role="complementary"
      aria-label="Main navigation sidebar"
    >
      <div className="p-6 border-b border-border">
        <AppLogo showTagline />
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2" aria-label="Main menu">
        {primaryNav.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

          return (
            <Link
              key={item.href}
              href={item.href}
              className={
                "flex items-center gap-3 px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent " +
                (isActive
                  ? "bg-accent text-background"
                  : "text-foreground hover:bg-border")
              }
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="w-5 h-5" />
              <span className="text-sm font-medium">{item.label}</span>
            </Link>
          )
        })}
      </nav>

      <div className="p-4 border-t border-border space-y-2">
        <Link
          href="/admin"
          className="flex items-center gap-3 px-4 py-2 rounded-lg text-foreground hover:bg-border transition-colors text-sm font-medium"
        >
          <Settings className="w-5 h-5" />
          Admin Console
        </Link>
        <LogoutButton />
      </div>
    </aside>
  )
}
