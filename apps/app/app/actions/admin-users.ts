"use server";

import { getPlatformAdmin, requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";

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

    const token = await getConvexAuthToken(); const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!token || !url) return { error: "Failed to fetch users", data: [] };
    const client = new ConvexHttpClient(url); client.setAuth(token);
    const roles = await client.query(api.platformAdmin.listUsers, {});

    const formatted = roles.map((r) => ({
      id: r.id, user_id: r.userId, role: r.role,
      business_name: r.businessName, business_id: r.businessId, created_at: new Date(r.createdAt),
    }));

    return { data: formatted };
  } catch {
    return { error: "Failed to fetch users", data: [] };
  }
}

export async function fetchMyRole(): Promise<string | null> {
  return (await getPlatformAdmin()) ? "super_admin" : null;
}
