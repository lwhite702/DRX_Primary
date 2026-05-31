import { redirect } from "next/navigation";
import { cache } from "react";
import { unstable_cache } from "next/cache";
import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import { AdminNavShell } from "./_components/AdminNavShell";

const getAdminRoleCached = (userId: string) => unstable_cache(
  async () => {
    const startTime = performance.now();
    const adminUser = await db.adminUser.findFirst({
      where: { userId },
      select: { role: true },
    });
    const duration = performance.now() - startTime;
    console.log(`[Admin DB Query] db.adminUser.findFirst took ${duration.toFixed(2)}ms`);
    return adminUser?.role ?? null;
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
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const adminRole = await getAdminRole(userId);

  if (adminRole !== "super_admin") {
    redirect("/dashboard");
  }

  return <AdminNavShell>{children}</AdminNavShell>;
}
