import { auth } from "@/lib/adapters/auth/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "./convex-token";

/** Completion belongs to the authenticated tenant membership, not a global Clerk flag. */
export async function getCompletedOnboardingBusinessId(userId: string) {
  if (process.env.BYPASS_AUTH_FOR_TESTING === "true") {
    return null;
  }
  const session = await auth();
  if (session.userId !== userId) throw new Error("Onboarding status is temporarily unavailable");
  const token = await getConvexAuthToken();
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!token || !url) throw new Error("Onboarding status is temporarily unavailable");
  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  try {
    const result = await client.query(api.onboarding.getCurrentOnboardingStatus, { expectedUserId: userId, expectedOrganizationId: session.orgId ?? null });
    if (result.status === "NEEDS_BUSINESS_ONBOARDING") return null;
    if (result.status !== "READY") throw new Error("Onboarding requires reconciliation");
    if (result.session.operatorId !== userId) throw new Error("Unexpected operator");
    return result.session.businessId;
  } catch {
    throw new Error("Onboarding status is temporarily unavailable");
  }
}
