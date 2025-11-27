"use client"

import Link from "next/link"
import { usePathname, useRouter } from 'next/navigation'
import { BarChart3, ShoppingCart, Package, Users, CreditCard, Settings, TrendingUp, FileText, LogOut } from 'lucide-react'
import { getSupabaseClient } from "@/lib/supabase/client"
import { toast } from "sonner"

function LogoutButton() {
  const router = useRouter()
  const supabase = getSupabaseClient()

  const handleLogout = async () => {
    if (!supabase) {
      toast.error("Supabase client not available")
      return
    }

    const { error } = await supabase.auth.signOut()
    
    if (error) {
      toast.error(error.message)
    } else {
      toast.success("Logged out successfully")
      router.push("/login")
      router.refresh()
    }
  }

  return (
    <button
      onClick={handleLogout}
      className="w-full flex items-center gap-3 px-4 py-2 rounded-lg text-foreground hover:bg-border transition-colors text-sm font-medium"
    >
      <LogOut className="w-5 h-5" />
      Logout
    </button>
  )
}

const mainNav = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/sales", label: "Sales", icon: ShoppingCart },
  { href: "/inventory", label: "Inventory", icon: Package },
  { href: "/customers", label: "Customers", icon: Users },
  { href: "/credit", label: "Credit", icon: CreditCard },
  { href: "/insights", label: "Insights", icon: TrendingUp },
  { href: "/reports", label: "Reports", icon: FileText },
  { href: "/settings", label: "Settings", icon: Settings },
]

export function Sidebar() {
  const pathname = usePathname()

  return (
    <aside className="w-64 bg-muted border-r border-border flex flex-col" role="complementary" aria-label="Main navigation sidebar">
      <div className="p-6 border-b border-border">
        <h1 className="text-xl font-bold text-accent">DRX CRM</h1>
        <p className="text-xs text-muted-foreground mt-1">DeelRx Point of Sale</p>
      </div>

      <nav className="flex-1 overflow-y-auto p-4 space-y-2" aria-label="Main menu">
        {mainNav.map((item) => {
          const Icon = item.icon
          const isActive = pathname.startsWith(item.href)
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-4 py-2 rounded-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent ${
                isActive
                  ? "bg-accent text-background"
                  : "text-foreground hover:bg-border"
              }`}
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
