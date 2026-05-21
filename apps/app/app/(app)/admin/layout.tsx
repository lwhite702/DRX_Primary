import { redirect } from "next/navigation";
import { cache } from "react";
import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import { AdminNavShell } from "./_components/AdminNavShell";

const getAdminRole = cache(async (userId: string) => {
  const adminUser = await db.adminUser.findFirst({
    where: { userId },
    select: { role: true },
  });

  return adminUser?.role ?? null;
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
