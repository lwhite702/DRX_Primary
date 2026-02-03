"use server";

import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";
import { revalidatePath } from "next/cache";

export type SetupBusinessData = {
  businessName: string;
  businessType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  ownerPhone: string;
  defaultUnit: string;
  quickQuantities: any[];
  privacyPreset: string;
  inventoryReasons: any[];
  nicknames: any[];
  ownerName: string;
};

export async function setupBusinessAction(data: SetupBusinessData) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return { error: "Unauthorized" };
    }

    // 1. Create Business Profile
    const business = await db.businessProfile.create({
      data: {
        businessName: data.businessName,
        businessType: data.businessType,
        address: data.address,
        city: data.city,
        state: data.state,
        zipCode: data.zipCode,
        phoneNumber: data.ownerPhone,
        ownerId: userId,
        isActive: true,
      },
    });

    if (!business) {
      return { error: "Failed to create business profile" };
    }

    // 2. Create Business Settings
    await db.businessSettings.create({
      data: {
        businessId: business.id,
        currency: "USD",
        timezone: "America/New_York", // Default
        settingsData: {
          onboarding_completed: true,
          default_unit: data.defaultUnit,
          quick_quantities: data.quickQuantities,
          privacy_preset: data.privacyPreset,
          inventory_reasons: data.inventoryReasons,
          nicknames: data.nicknames,
          owner_name: data.ownerName,
          default_tax_rate: 0.0,
        },
      },
      // Note: mapping to Prisma model might differ if settingsData is Json
    });

    // 3. Assign Owner Role
    await db.userRole.create({
      data: {
        businessId: business.id,
        userId: userId,
        role: "owner",
        permissions: { all: true }, // Json
      },
    });

    revalidatePath("/");
    return { success: true, businessId: business.id };
  } catch (error: any) {
    console.error("Setup business error:", error);
    return { error: error.message || "Failed to setup business" };
  }
}
