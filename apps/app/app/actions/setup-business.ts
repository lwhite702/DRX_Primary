"use server";

import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/adapters/auth/server";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { setupBusinessSchema, type SetupBusinessInput } from "@/lib/onboarding/setup-schema";
import { revalidatePath } from "next/cache";

export type SetupBusinessData = SetupBusinessInput;

export async function setupBusinessAction(data: SetupBusinessData) {
  const parsed = setupBusinessSchema.safeParse(data);
  if (!parsed.success) return { error: "Review the business setup fields and try again." };
  try {
    const { userId, orgId } = await auth();
    if (!userId) return { error: "Unauthorized" };
    const token = await getConvexAuthToken();
    if (!token) return { error: "Unauthorized" };
    const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!url) return { error: "Business setup is temporarily unavailable." };
    const client = new ConvexHttpClient(url);
    client.setAuth(token);
    const input = parsed.data;
    const result = await client.mutation(api.onboarding.createBusinessOnboarding, {
      businessName: input.businessName, businessType: input.businessType,
      expectedUserId: userId, expectedOrganizationId: orgId ?? null,
      name: input.ownerName, currency: "USD", timezone: "America/New_York",
      collectTax: false, taxRateBps: 0, setupJson: JSON.stringify(input),
    });
    if (result.status === "BUSINESS_MISSING") return { error: "Business setup requires reconciliation." };
    revalidatePath("/");
    return { success: true, businessId: result.businessId };
  } catch {
    return { error: "Business setup could not be saved. Please retry." };
  }
}
