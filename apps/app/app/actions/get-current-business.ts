"use server";

import { auth, isAuthBypassEnabled } from "@/lib/adapters/auth/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";

export async function getCurrentBusinessProfile() {
  if (isAuthBypassEnabled()) {
    const { orgId, userId } = await auth();
    return {
      id: orgId ?? "bypass-business",
      clerkOrgId: orgId ?? null,
      businessName: "Local Business",
      business_name: "Local Business",
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
