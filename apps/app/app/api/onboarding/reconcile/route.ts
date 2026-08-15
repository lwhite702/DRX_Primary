import { NextResponse } from "next/server";
import { auth, clerkClient, isAuthBypassEnabled } from "@/lib/adapters/auth/server";
import {
  ONBOARDING_COMPLETION_COOKIE,
} from "@/lib/auth/onboarding-completion";
import { getCompletedOnboardingBusinessId } from "@/lib/auth/onboarding-state";

const COMPLETION_COOKIE_MAX_AGE = 30 * 24 * 60 * 60;

export async function GET(request: Request) {
  const { userId, sessionClaims } = await auth();
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
      const claimsMetadata =
        typeof (sessionClaims as Record<string, unknown> | null)?.publicMetadata === "object" &&
        (sessionClaims as Record<string, unknown> | null)?.publicMetadata !== null
          ? ((sessionClaims as Record<string, unknown>).publicMetadata as Record<string, unknown>)
          : {};
      const client = await clerkClient();
      await client.users.updateUser(userId, {
        publicMetadata: {
          ...claimsMetadata,
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

  const response = NextResponse.redirect(new URL("/pos/sale", requestURL.origin), 303);
  response.cookies.set(ONBOARDING_COMPLETION_COOKIE, "true", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: COMPLETION_COOKIE_MAX_AGE,
  });
  return response;
}
