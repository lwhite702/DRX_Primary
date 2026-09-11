"use server";
import { businessClient } from "@/lib/business/convex-server";
import { api } from "@/convex/_generated/api";
import type { DashboardPreferences, DashboardViewPreset, PinnedPanelItemId } from "@/lib/auth/dashboard-preferences";
type UpdateDashboardPreferencesInput = { preset?: DashboardViewPreset; pinnedItemIds?: PinnedPanelItemId[] };
type ActionResult = { success: true; preferences: DashboardPreferences } | { success: false; error: string };
export async function getDashboardPreferencesAction(businessId?: string): Promise<ActionResult> {
  try {
    const { client, ...context } = await businessClient(businessId);
    const preferences = await client.query(api.businessPreferences.getDashboardPreferences, context);
    return { success: true, preferences: preferences as DashboardPreferences };
  } catch { return { success: false, error: "Dashboard view could not load." }; }
}
export async function updateDashboardPreferencesAction(input: UpdateDashboardPreferencesInput, businessId?: string): Promise<ActionResult> {
  try {
    const { client, ...context } = await businessClient(businessId);
    const preferences = await client.mutation(api.businessPreferences.updateDashboardPreferences, { ...input, ...context });
    return { success: true, preferences: preferences as DashboardPreferences };
  } catch { return { success: false, error: "Dashboard view could not be saved." }; }
}
