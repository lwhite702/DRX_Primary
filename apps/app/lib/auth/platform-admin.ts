import "server-only";
import { auth, isAuthBypassEnabled } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";

/** Platform authority comes only from AdminUser, never from tenant roles. */
export async function getPlatformAdmin() {
  if (isAuthBypassEnabled()) return null;
  const { userId } = await auth();
  if (!userId) return null;
  // Deliberately uncached: revocation must affect the next server request.
  const grant = await db.adminUser.findFirst({
    where: { userId, role: "super_admin" },
    select: { role: true },
  });
  return grant?.role === "super_admin" ? { userId } : null;
}

export async function requirePlatformAdmin() {
  const admin = await getPlatformAdmin();
  if (!admin) throw new Error("Platform administrator access required");
  return admin;
}
