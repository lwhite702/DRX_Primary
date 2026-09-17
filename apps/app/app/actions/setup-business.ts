"use server";

/* eslint-disable @typescript-eslint/no-explicit-any -- Preserve this legacy exported action contract. */

import { z } from "zod";
import { auth } from "@/lib/adapters/auth/server";
import type { PrivacyProfile } from "@/lib/privacy/types";
import { revalidatePath } from "next/cache";
import { provisionBusinessInConvex } from "@/lib/convex/onboarding-server";
import { setupBusinessSchema, type SetupBusinessInput } from "@/lib/onboarding/setup-schema";

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
  privacyPreset: PrivacyProfile;
  inventoryReasons: any[];
  nicknames: any[];
  ownerName: string;
  managerPin?: string;
};

export async function setupBusinessAction(data: SetupBusinessData) {
  try {
    const { orgId } = await auth();

    const businessName = data.businessName?.trim() || "My Business";
    const businessType = data.businessType?.trim() || "dispensary";
    const ownerName = data.ownerName?.trim() || "DRX Operator";
    const managerPin = data.managerPin?.trim() || undefined;

    const quickQuantities = Array.isArray(data.quickQuantities)
      ? data.quickQuantities.map((item) => ({
          label: String(item.label ?? "").trim() || "Item",
          value: Number(item.value) > 0 ? Number(item.value) : 1,
          unit: String(item.unit ?? data.defaultUnit ?? "g").trim() || "g",
          enabled: item.enabled !== false,
        }))
      : [];

    const inventoryReasons = Array.isArray(data.inventoryReasons)
      ? data.inventoryReasons.map((item) => ({
          label: String(item.label ?? "").trim() || "Adjustment",
          type: String(item.type ?? "positive").trim() || "positive",
          enabled: item.enabled !== false,
        }))
      : [];

    const nicknames = Array.isArray(data.nicknames)
      ? data.nicknames.map((item) => ({
          slang: String(item.slang ?? "").trim() || "Nickname",
          quantity: Number(item.quantity) > 0 ? Number(item.quantity) : 1,
          unit: String(item.unit ?? data.defaultUnit ?? "g").trim() || "g",
          enabled: item.enabled !== false,
        }))
      : [];

    const setupPayload: SetupBusinessInput = setupBusinessSchema.parse({
      businessName,
      businessType,
      address: (data.address ?? "").trim(),
      city: (data.city ?? "").trim(),
      state: (data.state ?? "").trim(),
      zipCode: (data.zipCode ?? "").trim(),
      ownerPhone: (data.ownerPhone ?? "").trim(),
      ownerName,
      defaultUnit: data.defaultUnit || "g",
      quickQuantities,
      privacyPreset: data.privacyPreset || "standard_mode",
      inventoryReasons,
      nicknames,
      managerPin,
    });

    const result = await provisionBusinessInConvex({
      name: ownerName,
      businessName,
      businessType,
      clerkOrgId: orgId ?? undefined,
      currency: "USD",
      timezone: "America/New_York",
      collectTax: false,
      taxRateBps: 0,
      setupJson: JSON.stringify(setupPayload),
    });

    if (result.status === "BUSINESS_MISSING") {
      return { error: "Business configuration could not be verified. Please reload and try again." };
    }

    revalidatePath("/");
    return { success: true, businessId: String(result.businessId) };
  } catch (error: unknown) {
    console.error("Setup business error:", error);
    if (error instanceof z.ZodError) {
      const firstIssue = error.issues[0];
      const field = firstIssue?.path.join(".") || "field";
      return {
        error: `Invalid onboarding value for ${field}: ${firstIssue?.message || "please check your input"}`,
      };
    }
    const message = error instanceof Error ? error.message : "";
    if (message.includes("INVALID_ARGUMENT") || message.includes("FORBIDDEN") || message.includes("UNAUTHENTICATED")) {
      return {
        error: message.replace(/^[A-Z_]+:\s*/, ""),
      };
    }
    return {
      error: "We couldn’t finish setup. Your answers are saved, so please try again.",
    };
  }
}

