import { redirect } from "next/navigation";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import { AdminNavShell } from "./_components/AdminNavShell";

import { isAuthBypassEnabledServer } from "@/lib/auth/bypass";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

const getAdminRoleCached = (userId: string) => unstable_cache(
  async () => {
    const startTime = performance.now();
    const adminUser = await db.adminUser.findFirst({
      where: { userId },
      select: { role: true },
    });
    
    if (adminUser?.role) return adminUser.role;

    // Business roles are persisted in UserRole, not a BusinessUser model.
    const businessAdmin = await db.userRole.findFirst({
      where: {
        userId,
        role: { in: ["owner", "admin"] },
      },
      select: { role: true },
    });

    const duration = performance.now() - startTime;
    console.log(`[Admin DB Query] admin role checks took ${duration.toFixed(2)}ms`);
    return adminUser?.role || businessAdmin?.role || null;
  },
  ["admin-role", userId],
  { tags: ["admin-role"], revalidate: 300 }
)();

const getAdminRole = cache(async (userId: string) => {
  return getAdminRoleCached(userId);
});

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const isBypass = isAuthBypassEnabledServer();
  const { userId } = await auth();

  if (!userId && !isBypass) {
    redirect("/login");
  }

  const effectiveUserId = userId || "default-bypass-id";
  const adminRole = isBypass ? "super_admin" : await getAdminRole(effectiveUserId);

  if (!adminRole) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center p-6 text-center">
        <div className="rounded-full bg-red-500/10 p-4 text-red-400">
          <ShieldAlert className="size-10" />
        </div>
        <h2 className="mt-4 text-2xl font-bold text-white">Administrator Access Required</h2>
        <p className="mt-2 max-w-md text-sm text-muted-foreground">
          You do not have administrative permissions to view the system administration console.
        </p>
        <div className="mt-6">
          <Link href="/dashboard">
            <Button variant="outline">Return to Dashboard</Button>
          </Link>
        </div>
      </div>
    );
  }

  return <AdminNavShell>{children}</AdminNavShell>;
}
