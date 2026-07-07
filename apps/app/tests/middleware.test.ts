import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@clerk/nextjs/server", () => ({
  createRouteMatcher: (patterns: string[]) => {
    return (req: { nextUrl: { pathname: string } }) => {
      const pathname = req.nextUrl.pathname;
      return patterns.some((pattern) => {
        if (pattern.endsWith("(.*)")) {
          return pathname.startsWith(pattern.replace("(.*)", ""));
        }
        return pathname === pattern;
      });
    };
  },
  clerkMiddleware: (handler: unknown) => handler,
}));

import middleware from "@/middleware";
import { ONBOARDING_COMPLETION_COOKIE } from "@/lib/auth/onboarding-completion";

type AuthResult = {
  userId: string | null;
  sessionClaims?: {
    metadata?: { onboardingComplete?: boolean };
    publicMetadata?: { onboardingComplete?: boolean };
    public_metadata?: { onboardingComplete?: boolean };
  };
};

function makeRequest(pathname: string, host: string, search = "", cookie = "") {
  return {
    nextUrl: {
      pathname,
      search,
    },
    method: "GET",
    headers: new Headers(cookie ? { host, cookie } : { host }),
  } as unknown as Request & {
    nextUrl: { pathname: string; search: string };
  };
}

async function runMiddleware(req: ReturnType<typeof makeRequest>, authResult: AuthResult) {
  const handler = middleware as unknown as (
    auth: () => Promise<AuthResult>,
    request: ReturnType<typeof makeRequest>,
  ) => Promise<Response>;
  return handler(async () => authResult, req);
}

describe("middleware auth and routing", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://deelrxcrm.app";
  });

  it("redirects marketing login to app login", async () => {
    const req = makeRequest("/login", "deelrxcrm.com");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("location")).toBe("https://deelrxcrm.app/login");
  });

  it("redirects root to login when signed out", async () => {
    const req = makeRequest("/", "deelrxcrm.app");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("location")).toBe("https://deelrxcrm.app/login");
  });

  it("redirects root to onboarding when signed in but onboarding incomplete", async () => {
    const req = makeRequest("/", "deelrxcrm.app");
    const res = await runMiddleware(req, {
      userId: "u_123",
      sessionClaims: { metadata: { onboardingComplete: false } },
    });
    expect(res.headers.get("location")).toBe("https://deelrxcrm.app/onboarding");
  });

  it("redirects signed in users away from login to dashboard when onboarding is complete", async () => {
    const req = makeRequest("/login", "deelrxcrm.app");
    const res = await runMiddleware(req, {
      userId: "u_123",
      sessionClaims: { metadata: { onboardingComplete: true } },
    });
    expect(res.headers.get("location")).toBe("https://deelrxcrm.app/dashboard");
  });

  it("redirects signed in users to onboarding for protected routes until onboarding is complete", async () => {
    const req = makeRequest("/dashboard", "deelrxcrm.app");
    const res = await runMiddleware(req, {
      userId: "u_123",
      sessionClaims: { metadata: { onboardingComplete: false } },
    });
    expect(res.headers.get("location")).toBe("https://deelrxcrm.app/onboarding");
  });

  it("allows protected routes when the completion cookie is set but Clerk claims are stale", async () => {
    const req = makeRequest(
      "/dashboard",
      "deelrxcrm.app",
      "",
      `${ONBOARDING_COMPLETION_COOKIE}=true`,
    );
    const res = await runMiddleware(req, {
      userId: "u_123",
      sessionClaims: { metadata: { onboardingComplete: false } },
    });
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects signed in users from onboarding to dashboard when onboarding is complete", async () => {
    const req = makeRequest("/onboarding", "deelrxcrm.app");
    const res = await runMiddleware(req, {
      userId: "u_123",
      sessionClaims: { metadata: { onboardingComplete: true } },
    });
    expect(res.headers.get("location")).toBe("https://deelrxcrm.app/dashboard");
  });

  it("redirects signed out users to login with redirect_url for non-api routes", async () => {
    const req = makeRequest("/dashboard", "deelrxcrm.app", "?tab=sales");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("location")).toBe(
      "https://deelrxcrm.app/login?redirect_url=%2Fdashboard%3Ftab%3Dsales",
    );
  });

  it("does not include redirect_url for api routes", async () => {
    const req = makeRequest("/api/team", "deelrxcrm.app");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("location")).toBe("https://deelrxcrm.app/login");
  });

  it("passes through public auth-domain routes", async () => {
    const req = makeRequest("/sign-in", "accounts.deelrxcrm.app");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("passes through /api/public routes without auth redirect", async () => {
    const req = makeRequest("/api/public/health", "deelrxcrm.app");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("passes through Next.js internal assets", async () => {
    const req = makeRequest("/_next/static/chunks/main.js", "deelrxcrm.app");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects marketing sign-in route to app sign-in", async () => {
    const req = makeRequest("/sign-in", "deelrxcrm.com");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("location")).toBe("https://deelrxcrm.app/sign-in");
  });
});
