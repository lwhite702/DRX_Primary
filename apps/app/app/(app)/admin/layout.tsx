import { redirect } from "next/navigation";
import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import { AdminNavShell } from "./_components/AdminNavShell";
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const adminUser = await db.adminUser.findFirst({
    where: { userId },
    select: { role: true },
  });

  if (adminUser?.role !== "super_admin") {
    redirect("/dashboard");
  }

  return <AdminNavShell>{children}</AdminNavShell>;
}
