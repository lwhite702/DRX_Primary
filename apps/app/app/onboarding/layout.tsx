import { auth } from "@/lib/adapters/auth/server";
import {
  isOnboardingCompletionCookieValue,
  ONBOARDING_COMPLETION_COOKIE,
} from "@/lib/auth/onboarding-completion";
import { getCompletedOnboardingBusinessId } from "@/lib/auth/onboarding-state";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function OnboardingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { userId } = await auth();

  if (!userId) {
    redirect("/login");
  }

  const cookieStore = await cookies();
  const requestHeaders = await headers();
  const isServerActionRequest = requestHeaders.has("next-action");
  const onboardingComplete =
    isOnboardingCompletionCookieValue(
      cookieStore.get(ONBOARDING_COMPLETION_COOKIE)?.value,
    );

  // Let a Server Action return its state before navigation. On ordinary visits,
  // global cookies/claims are only routing hints after the current tenant is verified.
  if (!isServerActionRequest && (await getCompletedOnboardingBusinessId(userId))) {
    redirect(onboardingComplete ? "/dashboard" : "/api/onboarding/reconcile");
  }

  return children;
}
