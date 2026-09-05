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
import { db } from "@/lib/db";
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
  const { userId, sessionClaims } = await auth();

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

  const existingBusiness = await db.businessProfile.findFirst({
    where: {
      ownerId: userId,
      isActive: true,
    },
    orderBy: { createdAt: "desc" },
    select: { id: true },
  });

  const business = existingBusiness
    ? await db.businessProfile.update({
        where: { id: existingBusiness.id },
        data: {
          businessName,
          isActive: true,
        },
        select: { id: true },
      })
    : await db.businessProfile.create({
        data: {
          businessName,
          ownerId: userId,
          isActive: true,
        },
        select: { id: true },
      });

  const existingSettings = await db.businessSettings.findUnique({
    where: { businessId: business.id },
    select: {
      id: true,
      settingsData: true,
    },
  });
  const existingSettingsData =
    existingSettings?.settingsData &&
    typeof existingSettings.settingsData === "object" &&
    !Array.isArray(existingSettings.settingsData)
      ? existingSettings.settingsData
      : {};
  const settingsData = {
    ...existingSettingsData,
    onboarding_completed: true,
    dashboard_preset: dashboardPreset,
    dashboard_preferences: dashboardPreferences,
    role: "owner",
    team_size: "1",
    tooling: "web",
    collect_tax: taxEnabled,
    default_tax_rate: taxRateBps / 10_000,
    operator_profile: {
      businessName,
      role: "owner",
      teamSize: "1",
      tooling: "web",
      ownerName,
    },
  };

  try {
    if (existingSettings) {
      await db.businessSettings.update({
        where: { id: existingSettings.id },
        data: {
          currency: "USD",
          timezone: "America/New_York",
          collectTax: taxEnabled,
          defaultTaxRate: taxRateBps / 10_000,
          settingsData,
        },
      });
    } else {
      await db.businessSettings.create({
        data: {
          businessId: business.id,
          currency: "USD",
          timezone: "America/New_York",
          collectTax: taxEnabled,
          defaultTaxRate: taxRateBps / 10_000,
          settingsData,
        },
      });
    }
  } catch (dbError) {
    console.warn(
      "[onboarding] businessSettings update with full schema failed, falling back to core settingsData:",
      dbError,
    );
    try {
      if (existingSettings) {
        await db.businessSettings.update({
          where: { id: existingSettings.id },
          data: {
            settingsData,
          },
        });
      } else {
        await db.businessSettings.create({
          data: {
            businessId: business.id,
            settingsData,
          },
        });
      }
    } catch (fallbackError) {
      console.error(
        "[onboarding] businessSettings fallback creation/update failed:",
        fallbackError,
      );
    }
  }

  const existingRole = await db.userRole.findFirst({
    where: {
      businessId: business.id,
      userId,
    },
    select: { id: true },
  });

  if (existingRole) {
    await db.userRole.update({
      where: { id: existingRole.id },
      data: {
        role: "owner",
        permissions: { all: true },
      },
    });
  } else {
    await db.userRole.create({
      data: {
        businessId: business.id,
        userId,
        role: "owner",
        permissions: { all: true },
      },
    });
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
