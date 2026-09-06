import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "./convex-token";

/** Completion belongs to the authenticated tenant membership, not a global Clerk flag. */
export async function getCompletedOnboardingBusinessId(userId: string) {
  const token = await getConvexAuthToken();
  const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!token || !url) throw new Error("Onboarding status is temporarily unavailable");
  const client = new ConvexHttpClient(url);
  client.setAuth(token);
  try {
    const result = await client.query(api.onboarding.getCurrentOnboardingStatus, {});
    if (result.status === "NEEDS_BUSINESS_ONBOARDING") return null;
    if (result.status !== "READY") throw new Error("Onboarding requires reconciliation");
    if (result.session.operatorId !== userId) throw new Error("Unexpected operator");
    return result.session.businessId;
  } catch {
    throw new Error("Onboarding status is temporarily unavailable");
  }
}
