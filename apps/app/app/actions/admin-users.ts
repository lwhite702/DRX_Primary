"use server";

import { getPlatformAdmin, requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { db } from "@/lib/db";
import type { PrismaClient } from "@prisma/client";

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
    await requirePlatformAdmin();

    const roles = await (db as PrismaClient).userRole.findMany({
      include: {
        business: {
          select: { businessName: true, id: true },
        },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const formatted = roles.map((r) => ({
      id: r.id,
      user_id: r.userId,
      role: r.role,
      business_name: r.business?.businessName || "N/A",
      business_id: r.business?.id || null, // Ensure string | null fits
      created_at: r.createdAt,
    }));

    return { data: formatted };
  } catch {
    return { error: "Failed to fetch users", data: [] };
  }
}

export async function fetchMyRole(): Promise<string | null> {
  return (await getPlatformAdmin()) ? "super_admin" : null;
}
