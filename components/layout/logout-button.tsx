"use client"

import { useRouter } from "next/navigation"
import { LogOut } from "lucide-react"
import { toast } from "sonner"

import { getSupabaseClient } from "@/lib/supabase/client"

export function LogoutButton({ className }: { className?: string }) {
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
      return
    }

    toast.success("Logged out successfully")
    router.push("/login")
    router.refresh()
  }

  return (
    <button
      onClick={handleLogout}
      className={
        className ??
        "w-full flex items-center gap-3 px-4 py-2 rounded-lg text-foreground hover:bg-border transition-colors text-sm font-medium"
      }
    >
      <LogOut className="w-5 h-5" />
      Logout
    </button>
  )
}
