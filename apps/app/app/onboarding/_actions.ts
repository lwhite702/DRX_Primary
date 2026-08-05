"use server";

import { auth, clerkClient, isAuthBypassEnabled } from "@/lib/adapters/auth/server";
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
  | { status: "success"; error: null };

export async function completeOnboarding(
  _previousState: OnboardingActionState,
  formData: FormData,
): Promise<OnboardingActionState> {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const businessName = String(formData.get("businessName") || "").trim();
  const role = String(formData.get("role") || "").trim();
  const teamSize = String(formData.get("teamSize") || "").trim();
  const tooling = String(formData.get("tooling") || "").trim();
  const dashboardPresetRaw = String(formData.get("dashboardPreset") || "operations").trim();
  const dashboardPreset: DashboardViewPreset =
    dashboardPresetRaw === "checkout" || dashboardPresetRaw === "inventory"
      ? dashboardPresetRaw
      : "operations";

  if (!businessName || !role || !teamSize) {
    throw new Error("Missing required onboarding fields.");
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
    role,
    team_size: teamSize,
    tooling,
    operator_profile: {
      businessName,
      role,
      teamSize,
      tooling,
    },
  };

  if (existingSettings) {
    await db.businessSettings.update({
      where: { id: existingSettings.id },
      data: {
        currency: "USD",
        timezone: "America/New_York",
        settingsData,
      },
    });
  } else {
    await db.businessSettings.create({
      data: {
        businessId: business.id,
        currency: "USD",
        timezone: "America/New_York",
        settingsData,
      },
    });
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
          role,
          teamSize,
          tooling,
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

  // Return a success result instead of relying on the server-action redirect
  // transport. The client performs a full document navigation so the next
  // request is guaranteed to include the new cookie and refreshed Clerk state.
  return { status: "success", error: null };
}
