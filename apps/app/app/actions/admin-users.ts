"use server";

import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import { Role } from "@/lib/auth/permissions";

export type AdminUserItem = {
  id: string; // role record id
  user_id: string;
  role: string | null;
  business_name: string;
  business_id: string | null;
  created_at: Date;
};

export async function fetchAdminUsers(): Promise<{
  data: AdminUserItem[];
  error?: string;
}> {
  try {
    const { userId: actorId } = await auth();
    if (!actorId) return { error: "Unauthorized", data: [] };

    // Verify admin/manager access?
    // For now, let's just return all roles. The page usually filters or restricts viewing.
    // Ideally we check the actor's role.

    const roles = await db.userRole.findMany({
      include: {
        business: {
          select: { businessName: true, id: true },
        },
      },
      orderBy: { createdAt: "desc" },
    });

    const formatted = roles.map((r: any) => ({
      id: r.id,
      user_id: r.userId,
      role: r.role,
      business_name: r.business?.businessName || "N/A",
      business_id: r.business?.id || null, // Ensure string | null fits
      created_at: r.createdAt,
    }));

    return { data: formatted };
  } catch (error) {
    console.error("Fetch users error:", error);
    return { error: "Failed to fetch users", data: [] };
  }
}

export async function fetchMyRole(): Promise<string | null> {
  const { userId } = await auth();
  if (!userId) return null;

  // Simplistic: First role found.
  const role = await db.userRole.findFirst({
    where: { userId },
    select: { role: true },
  });
  return role?.role || null;
}
