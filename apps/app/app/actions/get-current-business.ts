"use server";

import { auth, isAuthBypassEnabled } from "@/lib/adapters/auth/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";

export async function getCurrentBusinessProfile() {
  if (isAuthBypassEnabled()) {
    const { orgId, userId } = await auth();
    try {
      const { db } = await import("@/lib/db");
      const dbProfile = await (db as any).businessProfile?.findFirst({
        where: orgId
          ? { OR: [{ id: orgId }, { clerkOrgId: orgId }] }
          : (userId ? { ownerId: userId } : {}),
        include: { settings: true },
        orderBy: { createdAt: "asc" },
      });
      if (dbProfile) {
        return {
          id: dbProfile.id,
          clerkOrgId: dbProfile.clerkOrgId,
          businessName: dbProfile.businessName,
          business_name: dbProfile.businessName,
          businessType: dbProfile.businessType || "retail",
          role: "owner",
          ownerId: dbProfile.ownerId,
          isActive: dbProfile.isActive,
          is_active: dbProfile.isActive,
          address: dbProfile.address || "",
          city: dbProfile.city || "",
          state: dbProfile.state || "",
          zipCode: dbProfile.zipCode || "",
          zip_code: dbProfile.zipCode || "",
          phoneNumber: dbProfile.phoneNumber || "",
          phone_number: dbProfile.phoneNumber || "",
          timezone: dbProfile.timezone || "America/New_York",
          createdAt: dbProfile.createdAt,
          updatedAt: dbProfile.updatedAt,
          settingsData: (dbProfile.settings?.[0]?.settingsData as Record<string, unknown>) || {},
        };
      }
    } catch {
      // Fall through to fallback
    }
    const defaultName = process.env.DRX_DEMO_BUSINESS_NAME || "Northstar Demo Shop";
    return {
      id: orgId ?? "bypass-business",
      clerkOrgId: orgId ?? null,
      businessName: defaultName,
      business_name: defaultName,
      businessType: "retail",
      role: "super_admin",
      ownerId: userId ?? null,
      isActive: true,
      is_active: true,
      address: "",
      city: "",
      state: "",
      zipCode: "",
      zip_code: "",
      phoneNumber: "",
      phone_number: "",
      timezone: "America/New_York",
      createdAt: new Date(),
      updatedAt: new Date(),
      settingsData: {},
    };
  }

  try {
    const { userId, orgId } = await auth();
    if (!userId) return null;
    const token = await getConvexAuthToken();
    const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!token || !url) throw new Error("Business service is unavailable");
    const client = new ConvexHttpClient(url);
    client.setAuth(token);
    const profile = await client.query(api.session.currentBusinessProfile, {
      expectedOrganizationId: orgId ?? undefined,
      expectedUserId: userId,
    });
    return profile ? {
      ...profile,
      business_name: profile.businessName,
      business_type: profile.businessType,
      owner_id: profile.ownerId,
      is_active: profile.isActive,
      zip_code: profile.zipCode,
      phone_number: profile.phoneNumber,
      createdAt: new Date(profile.createdAt),
      updatedAt: new Date(profile.updatedAt),
    } : null;
  } catch {
    // Failure is not an empty account. Keep the UI out of onboarding on outages
    // and never expose provider payloads, identifiers or configuration in logs.
    throw new Error("We could not load your business. Please try again.");
  }
}
