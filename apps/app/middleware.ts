import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isMarketingRoute = createRouteMatcher([
  "/",
  "/pricing",
  "/about",
  "/contact",
  "/features(.*)",
  "/blog(.*)",
  "/docs(.*)",
]);

const isPublicAppRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/api/webhooks(.*)",
  "/api/uploadthing(.*)", // If using uploadthing
  "/brand(.*)",
  "/privacy",
  "/terms",
]);

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl;
  const hostname = req.headers.get("host") || "";

  // -------------------------------------------------------------------------
  // Domain Separation Logic
  // -------------------------------------------------------------------------
  const isMarketingDomain =
    hostname === "deelrxcrm.com" || hostname.endsWith(".deelrxcrm.com");
  const isAppDomain =
    hostname === "deelrxcrm.app" ||
    hostname.endsWith(".deelrxcrm.app") ||
    hostname.includes("localhost");
  const isAuthDomain =
    hostname === "accounts.deelrxcrm.app" ||
    hostname.endsWith(".accounts.deelrxcrm.app");

  // 1. Marketing Domain Logic
  if (isMarketingDomain) {
    // If trying to access app routes (dashboard, etc) from marketing domain, redirect to app domain
    if (
      url.pathname.startsWith("/dashboard") ||
      url.pathname.startsWith("/inventory")
    ) {
      const appUrl = new URL(url.pathname, "https://deelrxcrm.app");
      return NextResponse.redirect(appUrl);
    }
    // Otherwise allow access
    return NextResponse.next();
  }

  // 2. Authentication Domain Logic - Don't protect routes on auth domain to avoid redirect loops
  if (isAuthDomain) {
    return NextResponse.next();
  }

  // 3. App Domain Logic
  if (isAppDomain) {
    // Redirect root "/" to "/dashboard" (unless it's the login page, which is handled by isPublicAppRoute)
    if (url.pathname === "/") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }

    // Protect routes
    if (!isPublicAppRoute(req)) {
      await auth.protect();
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    // Skip Next.js internals and all static files, unless found in search params
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
