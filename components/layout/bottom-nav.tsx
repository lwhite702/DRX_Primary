"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { MoreHorizontal, Settings } from "lucide-react"

import { cn } from "@/lib/utils"
import { primaryNav } from "@/components/layout/nav-items"
import { LogoutButton } from "@/components/layout/logout-button"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const bottomNav = primaryNav.slice(0, 4)
const moreNav = primaryNav.slice(4)

export function BottomNav() {
  const pathname = usePathname()

  return (
    <nav
      className={cn(
        "md:hidden fixed inset-x-0 bottom-0 z-50 border-t border-border bg-muted/95 backdrop-blur supports-[backdrop-filter]:bg-muted/80",
        "pb-[env(safe-area-inset-bottom)]"
      )}
      aria-label="Primary navigation"
    >
      <div className="flex items-stretch">
        {bottomNav.map((item) => {
          const Icon = item.icon
          const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex-1 min-w-0 h-14 px-2 flex flex-col items-center justify-center gap-1 text-xs font-medium",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
                isActive ? "text-accent" : "text-muted-foreground"
              )}
              aria-current={isActive ? "page" : undefined}
            >
              <Icon className="h-5 w-5" />
              <span className="truncate">{item.label}</span>
            </Link>
          )
        })}

        <Sheet>
          <SheetTrigger asChild>
            <button
              type="button"
              className={cn(
                "flex-1 min-w-0 h-14 px-2 flex flex-col items-center justify-center gap-1 text-xs font-medium text-muted-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
              )}
              aria-label="More navigation"
            >
              <MoreHorizontal className="h-5 w-5" />
              <span className="truncate">More</span>
            </button>
          </SheetTrigger>
          <SheetContent
            side="bottom"
            className="rounded-t-xl p-0 max-h-[85vh] overflow-hidden"
          >
            <SheetHeader className="p-4 border-b border-border">
              <SheetTitle>Navigation</SheetTitle>
            </SheetHeader>
            <div className="p-2 overflow-y-auto">
              <div className="space-y-1">
                {moreNav.map((item) => {
                  const Icon = item.icon
                  const isActive = pathname === item.href || pathname.startsWith(item.href + "/")

                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={cn(
                        "flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium",
                        isActive ? "bg-accent text-background" : "text-foreground hover:bg-border"
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span className="min-w-0 truncate">{item.label}</span>
                    </Link>
                  )
                })}

                <Link
                  href="/admin"
                  className="flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-border"
                >
                  <Settings className="h-5 w-5" />
                  <span className="min-w-0 truncate">Admin Console</span>
                </Link>

                <div className="pt-2">
                  <LogoutButton className="w-full flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium text-foreground hover:bg-border" />
                </div>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      </div>
    </nav>
  )
}
