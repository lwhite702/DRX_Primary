import {
  clerkMiddleware,
  hasClerkServerEnv,
  isAuthBypassEnabled,
} from "@/lib/adapters/auth/server";
import {
  classifyDrxHost,
  isAuthEntryPath,
  isClerkUiPath,
  isOnboardingPath,
  isPublicAppPath,
  isStaticAssetPath,
  shouldRedirectMarketingToApp,
} from "@/lib/auth/route-classification";
import { NextResponse } from "next/server";
import {
  hasOnboardingCompletionCookieFromHeader,
  isOnboardingCompletionCookieValue,
  ONBOARDING_COMPLETION_COOKIE,
} from "@/lib/auth/onboarding-completion";
import { isAuthVisualFixtureEnabled } from "@/lib/auth/visual-fixtures";
// In preview/staging environments we occasionally deploy without Clerk secrets.
// Bypass Clerk middleware entirely in that case so Edge middleware doesn't crash.
const hasClerkMiddlewareEnv =
  !isAuthBypassEnabled() &&
  (process.env.NODE_ENV === "test" || hasClerkServerEnv());

function getCurrentOrigin(req: Request) {
  const host = req.headers.get("host") ?? "";
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  const protocol =
    forwardedProto ||
    (host.includes("localhost") || host.startsWith("127.0.0.1") ? "http" : "https");
  return `${protocol}://${host || "deelrxcrm.app"}`;
}

function getConfiguredAppOrigin() {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  return configured ? configured.replace(/\/$/, "") : "https://deelrxcrm.app";
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

function shouldServeVisualFixture(pathname: string) {
  return (
    isAuthVisualFixtureEnabled() &&
    (isClerkUiPath(pathname) || pathname.startsWith("/visual-fixtures/"))
  );
}

function isNestedAuthAssetPath(pathname: string) {
  return isAuthEntryPath(pathname) && isStaticAssetPath(pathname);
}

function hasOnboardingCompletionCookie(
  req: Request & {
    cookies?: {
      get(name: string): { value?: string } | string | undefined;
    };
  },
) {
  const cookie = req.cookies?.get(ONBOARDING_COMPLETION_COOKIE);
  const cookieValue = typeof cookie === "string" ? cookie : cookie?.value;
  return (
    isOnboardingCompletionCookieValue(cookieValue) ||
    hasOnboardingCompletionCookieFromHeader(req.headers.get("cookie"))
  );
}

function middlewareWithoutClerk(
  reqOrAuth: Request | unknown,
  maybeReq?: Request,
) {
  const isDirectRequest =
    typeof reqOrAuth === "object" &&
    reqOrAuth !== null &&
    ("nextUrl" in reqOrAuth || "url" in reqOrAuth);
  const req = (isDirectRequest ? reqOrAuth : maybeReq) as Request & {
    nextUrl?: { pathname: string; search: string };
    url?: string;
  };
  const nextUrlLike = req?.nextUrl ?? (req?.url ? new URL(req.url) : null);
  if (!nextUrlLike) {
    return NextResponse.next();
  }
  const pathname = nextUrlLike.pathname;
  if (pathname === "/admin" || pathname.startsWith("/admin/")) return new NextResponse(null, { status: 404 });
  if (pathname === "/control" || pathname.startsWith("/control/")) return new NextResponse(null, { status: 404 });
  const hostname = req.headers.get("host") || "";
  const hostKind = classifyDrxHost(hostname);

  if (isNestedAuthAssetPath(pathname)) {
    return new NextResponse(null, { status: 404 });
  }

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

  if (shouldServeVisualFixture(pathname)) {
    return NextResponse.next();
  }

  if (isAuthBypassEnabled()) {
    if (pathname === "/" || isAuthEntryPath(pathname) || pathname === "/waitlist") {
      return redirectToApp(req, "/dashboard", true);
    }
    return NextResponse.next();
  }

  if (pathname === "/" || isClerkUiPath(pathname)) {
    return redirectToApp(req, "/waitlist", true);
  }

  if (!isPublicAppPath(pathname) && !pathname.startsWith("/api")) {
    return redirectToApp(req, "/waitlist", true);
  }

  return NextResponse.next();
}

const clerkProtectedMiddleware = hasClerkMiddlewareEnv
  ? clerkMiddleware(async (auth, req) => {
      const url = req.nextUrl;
      const pathname = url.pathname;
      if (pathname === "/admin" || pathname.startsWith("/admin/")) return new NextResponse(null, { status: 404 });
      const hostname = req.headers.get("host") || "";
      const hostKind = classifyDrxHost(hostname);

      if (isNestedAuthAssetPath(pathname)) {
        return new NextResponse(null, { status: 404 });
      }

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

      if (shouldServeVisualFixture(pathname)) {
        return NextResponse.next();
      }

      const { userId } = await auth();
      // Platform staff need no merchant onboarding. The page and every data
      // operation independently require an explicit platform grant.
      if (pathname === "/control" || pathname.startsWith("/control/")) {
        const key = process.env.PLATFORM_CONSOLE_SLUG;
        if (!key || !/^[a-f0-9]{32,64}$/.test(key) || pathname.split("/")[2] !== key) {
          return new NextResponse(null, { status: 404 });
        }
        const signInPath = `/control/${key}/sign-in`;
        const isPlatformSignIn = pathname === signInPath || pathname.startsWith(`${signInPath}/`);
        const response = !userId && !isPlatformSignIn
          ? NextResponse.redirect(new URL(signInPath, getAppOrigin(req, true)))
          : NextResponse.next();
        response.headers.set("Cache-Control", "private, no-store");
        response.headers.set("X-Robots-Tag", "noindex, nofollow");
        response.headers.set("Referrer-Policy", "no-referrer");
        return response;
      }
      // This cookie is only a routing hint. Tenant completion and access are
      // verified by Convex-backed page/API guards, never global Clerk metadata.
      const onboardingComplete = hasOnboardingCompletionCookie(req);

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

export const proxy = (hasClerkMiddlewareEnv ? clerkProtectedMiddleware : middlewareWithoutClerk)!;

export const config = {
  matcher: [
    "/(login|register|sign-in|sign-up|sso-callback)(.*)",
    // Ownership verification must bypass Clerk and onboarding redirects entirely.
    "/((?!\\.well-known/replay-qa-security-nonce$|_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
