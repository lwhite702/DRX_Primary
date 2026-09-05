"use server";

import {
  auth,
  clerkClient,
  isAuthBypassEnabled,
} from "@/lib/adapters/auth/server";
import {
  ONBOARDING_COMPLETION_COOKIE,
  type OnboardingClaims,
} from "@/lib/auth/onboarding-completion";
import {
  getDefaultPinnedItemsForPreset,
  type DashboardViewPreset,
} from "@/lib/auth/dashboard-preferences";
import { provisionBusinessInConvex } from "@/lib/convex/onboarding-server";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export type OnboardingActionState =
  | { status: "idle"; error: null }
  | { status: "success"; error: null; summary: OnboardingSummary }
  | { status: "error"; error: string };

export type OnboardingSummary = {
  businessType: string;
  inventoryEnabled: boolean;
  taxEnabled: boolean;
  taxRateBps: number;
  businessName: string;
  ownerName: string;
  locationName: string;
  currency: string;
  timezone: string;
};

export async function completeOnboarding(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const { userId, orgId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const businessName = String(formData.get("businessName") || "").trim();
  const ownerName = String(formData.get("ownerName") || "").trim();
  const businessType = String(formData.get("businessType") || "other").trim();
  const currency = String(formData.get("currency") || "USD").trim();
  const timezone = String(
    formData.get("timezone") || "America/New_York",
  ).trim();
  const taxEnabled = String(formData.get("taxChoice") || "later") === "yes";
  const tracksInventory =
    String(formData.get("tracksInventory") || "true") === "true";
  const locationName = String(formData.get("locationName") || "").trim();
  const city = String(formData.get("city") || "").trim();
  const region = String(formData.get("region") || "").trim();
  const country = String(formData.get("country") || "").trim();
  const taxRateRaw = String(formData.get("taxRate") || "0");
  const taxRate = Number.parseFloat(taxRateRaw);
  const taxRateBps = Number.isFinite(taxRate) ? Math.round(taxRate * 100) : 0;
  const resolvedLocation = [locationName, city, region, country]
    .filter(Boolean)
    .join(" · ");
  const dashboardPresetRaw = String(
    formData.get("dashboardPreset") || "operations",
  ).trim();
  const dashboardPreset: DashboardViewPreset =
    dashboardPresetRaw === "checkout" || dashboardPresetRaw === "inventory"
      ? dashboardPresetRaw
      : "operations";

  if (!businessName || !ownerName) {
    return { status: "error", error: "Missing required onboarding fields." };
  }

  const claims = sessionClaims as OnboardingClaims & {
    metadata?: Record<string, unknown>;
    publicMetadata?: Record<string, unknown>;
    public_metadata?: Record<string, unknown>;
  };

  const currentMetadata =
    claims?.metadata || claims?.publicMetadata || claims?.public_metadata || {};
  const dashboardPreferences = {
    preset: dashboardPreset,
    pinnedItemIds: getDefaultPinnedItemsForPreset(dashboardPreset),
    version: 1,
    updatedAt: new Date().toISOString(),
  };

  try {
    await provisionBusinessInConvex({
      name: ownerName,
      businessName,
      businessType,
      clerkOrgId: orgId ?? undefined,
      currency,
      timezone,
      collectTax: taxEnabled,
      taxRateBps,
      setup: {
        locationName,
        city,
        region,
        country,
        tracksInventory,
        dashboardPreset,
      },
    });
  } catch {
    return {
      status: "error",
      error: "We couldn’t create your workspace just yet. Please try again.",
    };
  }

  if (!isAuthBypassEnabled()) {
    const client = await clerkClient();

    await client.users.updateUser(userId, {
      publicMetadata: {
        ...currentMetadata,
        onboardingComplete: true,
        operatorProfile: {
          businessName,
          role: "owner",
          teamSize: "1",
          tooling: "web",
          dashboardPreferences,
        },
      },
    });
  }

  const cookieStore = await cookies();
  cookieStore.set(ONBOARDING_COMPLETION_COOKIE, "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 10 * 60,
  });

  return {
    status: "success",
    error: null,
    summary: {
      businessType: businessType || "other",
      inventoryEnabled: tracksInventory,
      taxEnabled,
      taxRateBps,
      businessName,
      ownerName,
      locationName: resolvedLocation,
      currency,
      timezone,
    },
  };
}
