import { describe, it, expect, vi, beforeEach } from "vitest";
import { createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

vi.mock("@clerk/nextjs/server", () => ({
  createRouteMatcher: (patterns: string[]) => {
    return (req: any) => {
      const pathname = typeof req === "string" ? req : req.nextUrl.pathname;
      return patterns.some((pattern) => {
        if (pattern.endsWith("(.*)")) {
          return pathname.startsWith(pattern.replace("(.*)", ""));
        }
        return pathname === pattern;
      });
    };
  },
}));

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

const getAppOrigin = (req: any) => {
  const configured = process.env.NEXT_PUBLIC_APP_URL;
  if (configured) {
    return configured.replace(/\/$/, "");
  }

  const host = req.headers.get("host") ?? "deelrxcrm.app";
  const protocol = host.includes("localhost") ? "http" : "https";
  return `${protocol}://${host}`;
};

const redirectToApp = (req: any, pathname: string) =>
  NextResponse.redirect(new URL(pathname, getAppOrigin(req)));

const middleware = async (auth: any, req: any) => {
  const pathname = req.nextUrl.pathname;
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
      loginUrl.searchParams.set("redirect_url", pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
};

describe("middleware auth and routing", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://deelrxcrm.app";
  });

  it("redirects marketing login to app login", async () => {
    const req = {
      nextUrl: { pathname: "/login" },
      headers: { get: () => "deelrxcrm.com" },
    };

    const res = await middleware(async () => ({ userId: null }), req);
    expect(res.headers.get("location")).toBe("https://deelrxcrm.app/login");
  });

  it("redirects root to login when signed out", async () => {
    const req = {
      nextUrl: { pathname: "/", search: "" },
      headers: { get: () => "deelrxcrm.app" },
    };

    const res = await middleware(async () => ({ userId: null }), req);
    expect(res.headers.get("location")).toBe("https://deelrxcrm.app/login");
  });

  it("redirects root to dashboard when signed in", async () => {
    const req = {
      nextUrl: { pathname: "/", search: "" },
      headers: { get: () => "deelrxcrm.app" },
    };

    const res = await middleware(async () => ({ userId: "u_123" }), req);
    expect(res.headers.get("location")).toBe(
      "https://deelrxcrm.app/dashboard",
    );
  });

  it("redirects signed in users away from login", async () => {
    const req = {
      nextUrl: { pathname: "/login", search: "" },
      headers: { get: () => "deelrxcrm.app" },
    };

    const res = await middleware(async () => ({ userId: "u_123" }), req);
    expect(res.headers.get("location")).toBe(
      "https://deelrxcrm.app/dashboard",
    );
  });

  it("redirects signed out users to login with redirect_url", async () => {
    const req = {
      nextUrl: { pathname: "/dashboard", search: "" },
      headers: { get: () => "deelrxcrm.app" },
    };

    const res = await middleware(async () => ({ userId: null }), req);
    expect(res.headers.get("location")).toBe(
      "https://deelrxcrm.app/login?redirect_url=%2Fdashboard",
    );
  });

  it("allows public routes for signed out users", async () => {
    const req = {
      nextUrl: { pathname: "/login", search: "" },
      headers: { get: () => "deelrxcrm.app" },
    };

    const res = await middleware(async () => ({ userId: null }), req);
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("does not include redirect_url for api routes", async () => {
    const req = {
      nextUrl: { pathname: "/api/team", search: "" },
      headers: { get: () => "deelrxcrm.app" },
    };

    const res = await middleware(async () => ({ userId: null }), req);
    expect(res.headers.get("location")).toBe("https://deelrxcrm.app/login");
  });
});
