"use server";
import { requirePlatformAdmin } from "@/lib/auth/platform-admin";
import { getPlatformBusinesses } from "@/lib/platform/queries";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";

export async function fetchPlatformBusinesses() {
  try {
    const rows = await getPlatformBusinesses();
    return { data: rows.map((row) => ({
      id: row.id, business_name: row.businessName, business_type: row.businessType,
      is_active: row.isActive, created_at: row.createdAt.toISOString(),
    })) };
  } catch { return { data: [], error: "Business registry unavailable or access denied" }; }
}

export async function setPlatformBusinessActive(businessId: string, active: boolean) {
  try {
    const { userId } = await requirePlatformAdmin();
    if (!businessId || typeof active !== "boolean") return { error: "Invalid business update" };
    const token = await getConvexAuthToken(); const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!token || !url) return { error: "Business update failed or access denied" };
    const client = new ConvexHttpClient(url); client.setAuth(token);
    await client.mutation(api.platformAdmin.setBusinessActive, { businessId, active });
    return { success: true };
  } catch { return { error: "Business update failed or access denied" }; }
}
