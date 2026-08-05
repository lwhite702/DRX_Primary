import { NextResponse } from "next/server";
import { auth, clerkClient, isAuthBypassEnabled } from "@/lib/adapters/auth/server";
import {
  ONBOARDING_COMPLETION_COOKIE,
} from "@/lib/auth/onboarding-completion";
import { getCompletedOnboardingBusinessId } from "@/lib/auth/onboarding-state";

const COMPLETION_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export async function GET(request: Request) {
  const { userId } = await auth();
  const requestURL = new URL(request.url);

  if (!userId) {
    return NextResponse.redirect(new URL("/login", requestURL.origin), 303);
  }

  const businessId = await getCompletedOnboardingBusinessId(userId);
  if (!businessId) {
    return NextResponse.redirect(new URL("/onboarding", requestURL.origin), 303);
  }

  if (!isAuthBypassEnabled()) {
    try {
      const client = await clerkClient();
      const user = await client.users.getUser(userId);
      await client.users.updateUser(userId, {
        publicMetadata: {
          ...user.publicMetadata,
          onboardingComplete: true,
          businessId,
        },
      });
    } catch (error) {
      // The durable database state remains authoritative. The routing cookie
      // unblocks the operator while Clerk metadata can be repaired on a later visit.
      console.error("[onboarding-reconcile] Clerk metadata repair failed", error);
    }
  }

  const response = NextResponse.redirect(new URL("/dashboard", requestURL.origin), 303);
  response.cookies.set(ONBOARDING_COMPLETION_COOKIE, "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COMPLETION_COOKIE_MAX_AGE,
  });
  return response;
}
