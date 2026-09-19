"use server";
import { auth } from "@/lib/adapters/auth/server";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { onboardingCompletionSchema } from "@/lib/onboarding/completion-schema";
import { ONBOARDING_COMPLETION_COOKIE } from "@/lib/auth/onboarding-completion";
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
  _previousState: OnboardingActionState, formData: FormData,
): Promise<OnboardingActionState> {
  const { userId, orgId } = await auth();
  if (!userId) redirect("/login");
  const field = (key: string, fallback = "") => String(formData.get(key) ?? fallback).trim();
  const taxEnabled = field("taxChoice", "later") === "yes";
  const taxText = field("taxRate", "0") || "0";
  if (taxEnabled && !/^\d{1,3}(?:\.\d{1,2})?$/.test(taxText)) return { status: "error", error: "Enter a valid tax percentage with at most two decimal places." };
  const parsed = onboardingCompletionSchema.safeParse({
    businessName: field("businessName"), ownerName: field("ownerName"),
    businessType: field("businessType", "other"), currency: field("currency", "USD"),
    timezone: field("timezone", "America/New_York"), taxEnabled,
    taxRateBps: taxEnabled ? Math.round(Number(taxText) * 100) : 0,
    inventoryEnabled: field("tracksInventory", "true") === "true",
    locationName: field("locationName"), city: field("city"), region: field("region"), country: field("country"),
    dashboardPreset: field("dashboardPreset", "operations"),
  });
  if (!parsed.success) return { status: "error", error: "Review the onboarding fields and try again." };
  try {
    const token = await getConvexAuthToken();
    const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!token || !url) throw new Error("Unavailable");
    const client = new ConvexHttpClient(url); client.setAuth(token);
    await client.mutation(api.onboarding.completeBusinessOnboarding, { payload: JSON.stringify(parsed.data), expectedUserId: userId, expectedOrganizationId: orgId ?? null });
    const cookieStore = await cookies();
    cookieStore.set(ONBOARDING_COMPLETION_COOKIE, "true", {
      httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 30 * 24 * 60 * 60,
    });
    const input = parsed.data;
    return { status: "success", error: null, summary: {
      businessName: input.businessName, ownerName: input.ownerName, businessType: input.businessType,
      currency: input.currency, timezone: input.timezone, taxEnabled: input.taxEnabled, taxRateBps: input.taxRateBps,
      inventoryEnabled: input.inventoryEnabled,
      locationName: [input.locationName, input.city, input.region, input.country].filter(Boolean).join(" · "),
    } };
  } catch {
    return { status: "error", error: "Business setup could not be completed. Please retry." };
  }
}
