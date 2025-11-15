"use client"

import Link from "next/link"
import { usePathname } from 'next/navigation'
import { Building2, Users, Zap, Bot } from 'lucide-react'

const adminNav = [
  { href: "/admin/businesses", label: "Businesses", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit", label: "Audit Logs", icon: Zap },
  { href: "/admin/ai", label: "AI Management", icon: Bot },
]

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const pathname = usePathname()

  return (
    <div className="flex gap-0">
      <div className="w-48 bg-muted border-r border-border p-4">
        <h2 className="text-lg font-bold text-accent mb-6">Susana's Console</h2>
        <nav className="space-y-2">
          {adminNav.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${
                  isActive
                    ? "bg-accent text-background"
                    : "text-foreground hover:bg-border"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </div>

      <main className="flex-1 overflow-auto">{children}</main>
    </div>
  )
}
