import { describe, it, expect, vi } from "vitest";
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

// Mock the clerkMiddleware and createRouteMatcher
vi.mock("@clerk/nextjs/server", () => ({
  clerkMiddleware: (handler: any) => handler,
  createRouteMatcher: (patterns: string[]) => {
    return (req: any) => {
      const pathname = typeof req === "string" ? req : req.nextUrl.pathname;
      return patterns.some(pattern => {
        if (pattern.endsWith("(.*)")) {
          return pathname.startsWith(pattern.replace("(.*)", ""));
        }
        return pathname === pattern;
      });
    };
  }
}));

describe("Middleware Domain Logic", () => {
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
    "/api/uploadthing(.*)",
    "/brand(.*)",
    "/privacy",
    "/terms",
  ]);

  const middleware = async (auth: any, req: any) => {
    const url = req.nextUrl;
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

    // 1. Marketing Domain Logic
    if (isMarketingDomain) {
      if (
        url.pathname.startsWith("/dashboard") ||
        url.pathname.startsWith("/inventory")
      ) {
        const appUrl = new URL(url.pathname, "https://deelrxcrm.app");
        return NextResponse.redirect(appUrl);
      }
      return NextResponse.next();
    }

    // 2. Authentication Domain Logic - Don't protect routes on auth domain to avoid redirect loops
    if (isAuthDomain) {
      return NextResponse.next();
    }

    // 3. App Domain Logic
    if (isAppDomain) {
      if (url.pathname === "/") {
        return NextResponse.redirect(new URL("/dashboard", req.url));
      }

      if (!isPublicAppRoute(req)) {
        await auth.protect();
      }
    }

    return NextResponse.next();
  };

  it("should allow access to marketing domain routes", async () => {
    const mockAuth = { protect: vi.fn() };
    const mockReq = {
      nextUrl: { pathname: "/pricing" },
      headers: { get: () => "deelrxcrm.com" },
      url: "https://deelrxcrm.com/pricing"
    };

    const result = await middleware(mockAuth, mockReq);
    expect(result).toBe(NextResponse.next());
    expect(mockAuth.protect).not.toHaveBeenCalled();
  });

  it("should redirect app routes from marketing domain to app domain", async () => {
    const mockAuth = { protect: vi.fn() };
    const mockReq = {
      nextUrl: { pathname: "/dashboard" },
      headers: { get: () => "deelrxcrm.com" },
      url: "https://deelrxcrm.com/dashboard"
    };

    const result = await middleware(mockAuth, mockReq);
    expect(result).toBeInstanceOf(NextResponse);
    expect(result?.url?.toString()).toBe("https://deelrxcrm.app/dashboard");
  });

  it("should not protect routes on auth domain to avoid redirect loops", async () => {
    const mockAuth = { protect: vi.fn() };
    const mockReq = {
      nextUrl: { pathname: "/sign-in" },
      headers: { get: () => "accounts.deelrxcrm.app" },
      url: "https://accounts.deelrxcrm.app/sign-in"
    };

    const result = await middleware(mockAuth, mockReq);
    expect(result).toBe(NextResponse.next());
    expect(mockAuth.protect).not.toHaveBeenCalled();
  });

  it("should redirect root to dashboard on app domain", async () => {
    const mockAuth = { protect: vi.fn() };
    const mockReq = {
      nextUrl: { pathname: "/" },
      headers: { get: () => "deelrxcrm.app" },
      url: "https://deelrxcrm.app/"
    };

    const result = await middleware(mockAuth, mockReq);
    expect(result).toBeInstanceOf(NextResponse);
    expect(result?.url?.toString()).toBe("https://deelrxcrm.app/dashboard");
  });

  it("should not protect public routes on app domain", async () => {
    const mockAuth = { protect: vi.fn() };
    const mockReq = {
      nextUrl: { pathname: "/login" },
      headers: { get: () => "deelrxcrm.app" },
      url: "https://deelrxcrm.app/login"
    };

    const result = await middleware(mockAuth, mockReq);
    expect(result).toBe(NextResponse.next());
    expect(mockAuth.protect).not.toHaveBeenCalled();
  });

  it("should protect non-public routes on app domain", async () => {
    const mockAuth = { protect: vi.fn() };
    const mockReq = {
      nextUrl: { pathname: "/dashboard" },
      headers: { get: () => "deelrxcrm.app" },
      url: "https://deelrxcrm.app/dashboard"
    };

    await middleware(mockAuth, mockReq);
    expect(mockAuth.protect).toHaveBeenCalled();
  });

  it("should include Clerk callback routes as public", () => {
    expect(isPublicAppRoute("/sign-in")).toBe(true);
    expect(isPublicAppRoute("/sign-up")).toBe(true);
    expect(isPublicAppRoute("/sso-callback")).toBe(true);
  });
});