import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

const isPublicAppRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
  "/api/webhooks(.*)",
  "/api/uploadthing(.*)",
  "/brand(.*)",
  "/privacy",
  "/terms",
]);

const isAuthEntryRoute = createRouteMatcher([
  "/login(.*)",
  "/register(.*)",
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/sso-callback(.*)",
]);

function getAppOrigin(req: Request) {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const host = req.headers.get("host") ?? "deelrxcrm.app";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
}

function redirectToApp(req: Request, pathname: string) {
  return NextResponse.redirect(new URL(pathname, getAppOrigin(req)));
}

export default clerkMiddleware(async (auth, req) => {
  const url = req.nextUrl;
  const pathname = url.pathname;
  const hostname = req.headers.get("host") || "";

  const isMarketingDomain =
    hostname === "deelrxcrm.com" || hostname.endsWith(".deelrxcrm.com");
  const isAppDomain =
    hostname === "deelrxcrm.app" ||
    hostname.endsWith(".deelrxcrm.app") ||
    hostname.includes("localhost");
  const isAuthDomain =
    hostname === "accounts.deelrxcrm.app" ||
    hostname.endsWith(".accounts.deelrxcrm.app");

  if (isMarketingDomain) {
    if (
      pathname.startsWith("/dashboard") ||
      pathname.startsWith("/inventory") ||
      pathname.startsWith("/login") ||
      pathname.startsWith("/register")
    ) {
      return redirectToApp(req, pathname);
    }

    return NextResponse.next();
  }

  if (isAuthDomain) {
    if (isPublicAppRoute(req)) {
      return NextResponse.next();
    }

    return redirectToApp(req, pathname);
  }

  if (!isAppDomain) {
    return NextResponse.next();
  }

  const { userId } = await auth();

  if (pathname === "/") {
    return redirectToApp(req, userId ? "/dashboard" : "/login");
  }

  if (userId && isAuthEntryRoute(req)) {
    return redirectToApp(req, "/dashboard");
  }

  if (!userId && !isPublicAppRoute(req)) {
    const loginUrl = new URL("/login", getAppOrigin(req));
    if (!pathname.startsWith("/api")) {
      loginUrl.searchParams.set("redirect_url", `${pathname}${url.search}`);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
