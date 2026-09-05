"use server";

import { auth, clerkClient, isAuthBypassEnabled } from "@/lib/adapters/auth/server";
import {
  extractDashboardPreferencesFromMetadata,
  getDefaultDashboardPreferences,
  mergeDashboardPreferences,
  type DashboardPreferences,
  type DashboardViewPreset,
  type PinnedPanelItemId,
} from "@/lib/auth/dashboard-preferences";

type UpdateDashboardPreferencesInput = {
  preset?: DashboardViewPreset;
  pinnedItemIds?: PinnedPanelItemId[];
};

type ActionResult =
  | { success: true; preferences: DashboardPreferences }
  | { success: false; error: string };

function getPublicMetadata(sessionClaims: unknown) {
  return sessionClaims &&
    typeof sessionClaims === "object" &&
    !Array.isArray(sessionClaims)
    ? (sessionClaims as { publicMetadata?: unknown }).publicMetadata
    : {};
}

export async function updateDashboardPreferencesAction(
  input: UpdateDashboardPreferencesInput,
): Promise<ActionResult> {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (isAuthBypassEnabled()) {
      const current = extractDashboardPreferencesFromMetadata(
        (sessionClaims as { publicMetadata?: unknown } | null)?.publicMetadata ?? {},
      );
      return {
        success: true,
        preferences: mergeDashboardPreferences(current, input),
      };
    }

    const client = await clerkClient();
    const rawPublicMetadata = getPublicMetadata(sessionClaims);
    const publicMetadata =
      rawPublicMetadata && typeof rawPublicMetadata === "object" && !Array.isArray(rawPublicMetadata)
        ? (rawPublicMetadata as Record<string, unknown>)
        : {};
    const operatorProfile =
      (publicMetadata.operatorProfile as Record<string, unknown> | undefined) ?? {};

    const current = extractDashboardPreferencesFromMetadata(publicMetadata);
    const next = mergeDashboardPreferences(current, input);

    await client.users.updateUser(userId, {
      publicMetadata: {
        ...publicMetadata,
        operatorProfile: {
          ...operatorProfile,
          dashboardPreferences: next,
        },
      },
    });

    return { success: true, preferences: next };
  } catch (error) {
    console.error("Failed to update dashboard preferences:", error);
    return { success: false, error: "Failed to update dashboard preferences" };
  }
}

export async function getDashboardPreferencesAction(): Promise<ActionResult> {
  try {
    const { userId, sessionClaims } = await auth();
    if (!userId) {
      return { success: false, error: "Unauthorized" };
    }

    if (isAuthBypassEnabled()) {
      return { success: true, preferences: getDefaultDashboardPreferences() };
    }

    const claims = sessionClaims as {
      metadata?: unknown;
      publicMetadata?: unknown;
      public_metadata?: unknown;
    };

    const prefs = extractDashboardPreferencesFromMetadata(
      claims?.publicMetadata ?? claims?.public_metadata ?? claims?.metadata ?? {},
    );

    return { success: true, preferences: prefs };
  } catch (error) {
    console.error("Failed to load dashboard preferences:", error);
    return { success: false, error: "Failed to load dashboard preferences" };
  }
}
