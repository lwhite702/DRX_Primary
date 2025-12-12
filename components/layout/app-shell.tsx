"use client"

import * as React from "react"
import { usePathname } from "next/navigation"

import { Sidebar } from "@/components/layout/sidebar"
import { TopNav } from "@/components/layout/top-nav"
import { Footer } from "@/components/layout/footer"
import { BottomNav } from "@/components/layout/bottom-nav"

const publicRoutes = ["/login", "/privacy", "/terms", "/accessibility"]

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const isPublic = publicRoutes.some((route) => pathname.startsWith(route))

  if (isPublic) {
    return <>{children}</>
  }

  return (
    <div className="flex min-h-screen flex-col">
      <div className="flex flex-1 min-w-0">
        <div className="hidden md:block">
          <Sidebar />
        </div>

        <main className="flex-1 flex flex-col min-w-0">
          <TopNav />
          <div
            id="main-content"
            className={
              "flex-1 overflow-auto min-w-0 " +
              "pb-[calc(3.5rem+env(safe-area-inset-bottom))] md:pb-0"
            }
          >
            {children}
          </div>
        </main>
      </div>

      <div className="hidden md:block">
        <Footer />
      </div>

      <BottomNav />
    </div>
  )
}
