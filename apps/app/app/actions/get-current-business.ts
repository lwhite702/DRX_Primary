"use server";

import { auth, isAuthBypassEnabled } from "@/lib/adapters/auth/server";
import { getBusinessProfileFromConvex } from "@/lib/convex/onboarding-server";

export async function getCurrentBusinessProfile() {
  try {
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
        settingsData: {},
      };
    }

    const profile = await getBusinessProfileFromConvex();
    if (!profile) return null;
    let settingsData: Record<string, unknown> = {};
    if (profile.settingsData) {
      try {
        settingsData = JSON.parse(profile.settingsData) as Record<string, unknown>;
      } catch {
        // A malformed optional settings payload must not hide a valid workspace.
      }
    }
    return {
      ...profile,
      isActive: true,
      is_active: true,
      address: String(settingsData.address ?? ""),
      city: String(settingsData.city ?? ""),
      state: String(settingsData.region ?? ""),
      zipCode: String(settingsData.postal_code ?? ""),
      zip_code: String(settingsData.postal_code ?? ""),
      phoneNumber: String(settingsData.owner_phone ?? ""),
      phone_number: String(settingsData.owner_phone ?? ""),
      settingsData,
    };
  } catch (error) {
    console.error("Error fetching current business profile:", error);
    return null;
  }
}
