import { clerkMiddleware, isAuthBypassEnabled } from "@/lib/adapters/auth/server";
import {
  classifyDrxHost,
  isAuthEntryPath,
  isClerkUiPath,
  isOnboardingPath,
  isPublicAppPath,
  shouldRedirectMarketingToApp,
} from "@/lib/auth/route-classification";
import { NextResponse } from "next/server";

const PUBLIC_APP_REDIRECTS: Readonly<Record<string, string>> = {
  "/privacy": "https://www.deelrxcrm.com/legal/privacy",
  "/privacy-policy": "https://www.deelrxcrm.com/legal/privacy",
  "/legal/privacy": "https://www.deelrxcrm.com/legal/privacy",
  "/terms": "https://www.deelrxcrm.com/legal/terms",
  "/legal/terms": "https://www.deelrxcrm.com/legal/terms",
  "/support": "https://www.deelrxcrm.com/support",
};

// In preview/staging environments we occasionally deploy without Clerk secrets.
// Bypass Clerk middleware entirely in that case so Edge middleware doesn't crash.
const hasClerkMiddlewareEnv =
  !isAuthBypassEnabled() &&
  (process.env.NODE_ENV === "test" ||
    (Boolean(process.env.CLERK_SECRET_KEY) &&
      Boolean(
        process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY || process.env.CLERK_PUBLISHABLE_KEY,
      )));

function getCurrentOrigin(req: Request) {
  const host = req.headers.get("host") ?? "";
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol =
    forwardedProto ||
    (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${protocol}://${host || "www.deelrxcrm.app"}`;
}

function getConfiguredAppOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  return configured ? configured.replace(/\/$/, "") : "https://www.deelrxcrm.app";
}

function getAppOrigin(req: Request, preserveCurrentHost = false) {
  if (preserveCurrentHost) {
    return getCurrentOrigin(req);
  }

  return getConfiguredAppOrigin();
}

function redirectToApp(req: Request, pathname: string, preserveCurrentHost = false) {
  return NextResponse.redirect(new URL(pathname, getAppOrigin(req, preserveCurrentHost)));
}

function redirectPublicAppPath(pathname: string) {
  const target = PUBLIC_APP_REDIRECTS[pathname];
  return target ? NextResponse.redirect(target, 308) : null;
}

function middlewareWithoutClerk(
  reqOrAuth: Request | unknown,
  maybeReq?: Request,
) {
  const req = (maybeReq ?? reqOrAuth) as Request & {
    nextUrl?: { pathname: string; search: string };
    url?: string;
  };
  const nextUrlLike = req?.nextUrl ?? (req?.url ? new URL(req.url) : null);
  if (!nextUrlLike) {
    return NextResponse.next();
  }
  const pathname = nextUrlLike.pathname;
  const hostname = req.headers.get("host") || "";
  const hostKind = classifyDrxHost(hostname);

  if (hostKind === "marketing") {
    if (shouldRedirectMarketingToApp(pathname)) {
      return redirectToApp(req, "/waitlist");
    }
    return NextResponse.next();
  }

  if (hostKind === "auth") {
    if (isAuthBypassEnabled()) {
      return redirectToApp(req, "/dashboard");
    }
    return redirectToApp(req, "/waitlist");
  }

  if (hostKind !== "app") {
    return NextResponse.next();
  }

  const publicRedirect = redirectPublicAppPath(pathname);
  if (publicRedirect) return publicRedirect;

  if (isAuthBypassEnabled()) {
    if (pathname === "/" || isAuthEntryPath(pathname) || pathname === "/waitlist") {
      return redirectToApp(req, "/dashboard", true);
    }
    return NextResponse.next();
  }

  if (pathname === "/" || isClerkUiPath(pathname)) {
    return redirectToApp(req, "/waitlist", true);
  }

  if (!isPublicAppPath(pathname) && pathname.startsWith("/api")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (!isPublicAppPath(pathname)) {
    return redirectToApp(req, "/waitlist", true);
  }

  return NextResponse.next();
}

const clerkProtectedMiddleware = hasClerkMiddlewareEnv
  ? clerkMiddleware(async (auth, req) => {
      const url = req.nextUrl;
      const pathname = url.pathname;
      const hostname = req.headers.get("host") || "";
      const hostKind = classifyDrxHost(hostname);

      // Always allow webhook ingestion without redirect logic.
      if (pathname.startsWith("/api/webhooks")) {
        if (process.env.NODE_ENV !== "production") {
          console.info("[middleware:webhook-bypass]", {
            pathname,
            method: req.method,
            host: hostname,
          });
        }
        return NextResponse.next();
      }

      if (hostKind === "marketing") {
        if (shouldRedirectMarketingToApp(pathname)) {
          return redirectToApp(req, pathname);
        }

        return NextResponse.next();
      }

      if (hostKind === "auth") {
        if (isPublicAppPath(pathname)) {
          return NextResponse.next();
        }

        return redirectToApp(req, pathname);
      }

      if (hostKind !== "app") {
        return NextResponse.next();
      }

      const publicRedirect = redirectPublicAppPath(pathname);
      if (publicRedirect) return publicRedirect;

      const { userId, sessionClaims } = await auth();
      const claims = sessionClaims as {
        metadata?: { onboardingComplete?: boolean };
        publicMetadata?: { onboardingComplete?: boolean };
        public_metadata?: { onboardingComplete?: boolean };
      };
      const onboardingComplete =
        claims?.metadata?.onboardingComplete === true ||
        claims?.publicMetadata?.onboardingComplete === true ||
        claims?.public_metadata?.onboardingComplete === true;

      if (pathname === "/") {
        if (!userId) {
          return redirectToApp(req, "/login", true);
        }

        return redirectToApp(req, onboardingComplete ? "/dashboard" : "/onboarding", true);
      }

      if (userId && isAuthEntryPath(pathname)) {
        return redirectToApp(req, onboardingComplete ? "/dashboard" : "/onboarding", true);
      }

      if (userId && !pathname.startsWith("/api")) {
        if (!onboardingComplete && !isOnboardingPath(pathname)) {
          return redirectToApp(req, "/onboarding", true);
        }

        if (onboardingComplete && isOnboardingPath(pathname)) {
          return redirectToApp(req, "/dashboard", true);
        }
      }

      if (!userId && !isPublicAppPath(pathname)) {
        if (pathname.startsWith("/api")) {
          return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        const loginUrl = new URL("/login", getAppOrigin(req, true));
        loginUrl.searchParams.set("redirect_url", `${pathname}${url.search}`);
        return NextResponse.redirect(loginUrl);
      }

      return NextResponse.next();
    })
  : null;

export default (hasClerkMiddlewareEnv ? clerkProtectedMiddleware : middlewareWithoutClerk)!;

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
