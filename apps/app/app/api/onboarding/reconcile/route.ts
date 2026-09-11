import { NextResponse } from "next/server";
import { auth } from "@/lib/adapters/auth/server";
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

  let businessId: string | null;
  try { businessId = await getCompletedOnboardingBusinessId(userId); }
  catch {
    return NextResponse.json({ error: "Onboarding status is temporarily unavailable" }, {
      status: 503, headers: { "Cache-Control": "private, no-store" },
    });
  }
  if (!businessId) {
    return NextResponse.redirect(new URL("/onboarding", requestURL.origin), 303);
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
