import { auth } from "@/lib/adapters/auth/server";
import {
  hasCompletedOnboardingClaims,
  isOnboardingCompletionCookieValue,
  ONBOARDING_COMPLETION_COOKIE,
  type OnboardingClaims,
} from "@/lib/auth/onboarding-completion";
import { getCompletedOnboardingBusinessId } from "@/lib/auth/onboarding-state";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId, sessionClaims } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const claims = sessionClaims as OnboardingClaims;
  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const isServerActionRequest = requestHeaders.has("next-action");
  const onboardingComplete =
    hasCompletedOnboardingClaims(claims) ||
    isOnboardingCompletionCookieValue(
      cookieStore.get(ONBOARDING_COMPLETION_COOKIE)?.value,
    );

  // A Server Action re-renders this layout before its returned state commits.
  // Let that response reach the client so it can perform the intentional hard
  // navigation with the freshly persisted cookie and Clerk metadata.
  if (onboardingComplete && !isServerActionRequest) {
    redirect("/pos/sale");
  }

  // Existing operators may have completed setup before the Clerk metadata gate
  // was introduced. Reconcile their durable database state instead of trapping
  // them in onboarding with a stale session claim.
  if (!isServerActionRequest && (await getCompletedOnboardingBusinessId(userId))) {
    redirect("/api/onboarding/reconcile");
  }

  return children;
}
