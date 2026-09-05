"use server";

import { getBusinessProfileFromConvex } from "@/lib/convex/onboarding-server";

export async function getCurrentBusinessProfile() {
  try {
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
