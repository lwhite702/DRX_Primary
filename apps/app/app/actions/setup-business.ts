"use server";

import { auth } from "@/lib/adapters/auth/server";
import { getDefaultPrivacyProtocol } from "@/lib/privacy/profiles";
import type { PrivacyProfile } from "@/lib/privacy/types";
import { revalidatePath } from "next/cache";
import { provisionBusinessInConvex } from "@/lib/convex/onboarding-server";

type QuickQuantityInput = { label: string; value: number; unit: string };
type InventoryReasonInput = { label: string; type: string };
type NicknameInput = { slang: string; quantity: number; unit: string };

export type SetupBusinessData = {
  businessName: string;
  businessType: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  ownerPhone: string;
  defaultUnit: string;
  quickQuantities: QuickQuantityInput[];
  privacyPreset: PrivacyProfile;
  inventoryReasons: InventoryReasonInput[];
  nicknames: NicknameInput[];
  ownerName: string;
};

export async function setupBusinessAction(data: SetupBusinessData) {
  try {
    const { orgId } = await auth();
    const privacyProtocol = getDefaultPrivacyProtocol(data.privacyPreset);
    const result = await provisionBusinessInConvex({
      name: data.ownerName,
      businessName: data.businessName,
      businessType: data.businessType,
      clerkOrgId: orgId ?? undefined,
      currency: "USD",
      timezone: "America/New_York",
      collectTax: false,
      taxRateBps: 0,
      setup: {
        address: data.address,
        city: data.city,
        region: data.state,
        postalCode: data.zipCode,
        ownerPhone: data.ownerPhone,
        defaultUnit: data.defaultUnit,
        privacyPreset: data.privacyPreset,
        privacyProtocolJson: JSON.stringify(privacyProtocol),
        quickQuantities: data.quickQuantities.map(({ label, value, unit }) => ({
          label,
          value,
          unit,
        })),
        inventoryReasons: data.inventoryReasons.map(({ label, type }) => ({
          label,
          type,
        })),
        nicknames: data.nicknames.map(({ slang, quantity, unit }) => ({
          slang,
          quantity,
          unit,
        })),
      },
    });

    revalidatePath("/");
    return { success: true, businessId: String(result.businessId) };
  } catch (error: unknown) {
    console.error("Setup business error:", error);
    return {
      error: "We couldn’t finish setup. Your answers are saved, so please try again.",
    };
  }
}
