"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { createAppClient } from "@/lib/data/client/supabase-client";
import {
  Building2,
  Users,
  Zap,
  Bot,
  LayoutDashboard,
  CheckCircle,
} from "lucide-react";

const adminNav = [
  { href: "/admin", label: "Overview", icon: LayoutDashboard },
  { href: "/admin/approvals", label: "Approvals", icon: CheckCircle },
  { href: "/admin/businesses", label: "Businesses", icon: Building2 },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/audit", label: "Audit Logs", icon: Zap },
  { href: "/admin/ai", label: "AI Management", icon: Bot },
  { href: "/admin/features", label: "Features", icon: Zap },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const supabase = createAppClient();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!supabase) return;

    const checkAdmin = async () => {
      try {
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
          router.push("/login");
          return;
        }

        const { data: adminUser } = await supabase
          .from("admin_users")
          .select("role")
          .eq("user_id", user.id)
          .single();

        if (adminUser?.role === "super_admin") {
          setAuthorized(true);
        } else {
          router.push("/dashboard");
        }
      } catch (error) {
        console.error("Admin check failed", error);
        router.push("/dashboard");
      } finally {
        setLoading(false);
      }
    };

    checkAdmin();
  }, [supabase, router]);

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!authorized) {
    return null;
  }

  return (
    <div className="h-full flex flex-col">
      {/* Admin Navigation Tabs */}
      <div className="border-b border-border bg-muted/30">
        <div className="flex flex-wrap gap-1 px-2 sm:px-4 py-2">
          {adminNav.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href === "/admin" && pathname === "/admin");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-2 px-3 sm:px-4 py-2 rounded-lg md:rounded-t-lg transition-colors text-sm font-medium ${
                  isActive
                    ? "bg-background text-foreground border md:border-t md:border-x border-border"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </div>

      {/* Admin Content */}
      <div className="flex-1 overflow-auto">{children}</div>
    </div>
  );
}
