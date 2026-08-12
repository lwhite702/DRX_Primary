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

import { proxy } from "@/proxy";
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
  const handler = proxy as unknown as (
    auth: () => Promise<AuthResult>,
    request: ReturnType<typeof makeRequest>,
  ) => Promise<Response>;
  return handler(async () => authResult, req);
}

describe("proxy auth and routing", () => {
  beforeEach(() => {
    process.env.NEXT_PUBLIC_APP_URL = "https://www.deelrxcrm.app";
  });

  it("redirects marketing login to app login", async () => {
    const req = makeRequest("/login", "deelrxcrm.com");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("location")).toBe("https://www.deelrxcrm.app/login");
  });

  it("redirects root to login when signed out", async () => {
    const req = makeRequest("/", "www.deelrxcrm.app");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("location")).toBe("https://www.deelrxcrm.app/login");
  });

  it("redirects root to onboarding when signed in but onboarding incomplete", async () => {
    const req = makeRequest("/", "www.deelrxcrm.app");
    const res = await runMiddleware(req, {
      userId: "u_123",
      sessionClaims: { metadata: { onboardingComplete: false } },
    });
    expect(res.headers.get("location")).toBe("https://www.deelrxcrm.app/onboarding");
  });

  it("redirects signed in users away from login to dashboard when onboarding is complete", async () => {
    const req = makeRequest("/login", "www.deelrxcrm.app");
    const res = await runMiddleware(req, {
      userId: "u_123",
      sessionClaims: { metadata: { onboardingComplete: true } },
    });
    expect(res.headers.get("location")).toBe("https://www.deelrxcrm.app/dashboard");
  });

  it("redirects signed in users to onboarding for protected routes until onboarding is complete", async () => {
    const req = makeRequest("/dashboard", "www.deelrxcrm.app");
    const res = await runMiddleware(req, {
      userId: "u_123",
      sessionClaims: { metadata: { onboardingComplete: false } },
    });
    expect(res.headers.get("location")).toBe("https://www.deelrxcrm.app/onboarding");
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
    const req = makeRequest("/onboarding", "www.deelrxcrm.app");
    const res = await runMiddleware(req, {
      userId: "u_123",
      sessionClaims: { metadata: { onboardingComplete: true } },
    });
    expect(res.headers.get("location")).toBe("https://www.deelrxcrm.app/dashboard");
  });

  it("redirects signed out users to login with redirect_url for non-api routes", async () => {
    const req = makeRequest("/dashboard", "www.deelrxcrm.app", "?tab=sales");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("location")).toBe(
      "https://www.deelrxcrm.app/login?redirect_url=%2Fdashboard%3Ftab%3Dsales",
    );
  });

  it("returns JSON unauthorized for protected api routes", async () => {
    const req = makeRequest("/api/team", "deelrxcrm.app");
    const res = await runMiddleware(req, { userId: null });
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("application/json");
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("passes through public auth-domain routes", async () => {
    const req = makeRequest("/sign-in", "clerk.deelrxcrm.app");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("passes through deterministic auth fixtures outside production", async () => {
    const previousVisualFixtures = process.env.VISUAL_FIXTURES;
    process.env.VISUAL_FIXTURES = "true";

    try {
      const req = makeRequest("/login", "deelrxcrm.app");
      const res = await runMiddleware(req, { userId: null });
      expect(res.headers.get("x-middleware-next")).toBe("1");
    } finally {
      if (previousVisualFixtures === undefined) {
        delete process.env.VISUAL_FIXTURES;
      } else {
        process.env.VISUAL_FIXTURES = previousVisualFixtures;
      }
    }
  });

  it("passes through /api/public routes without auth redirect", async () => {
    const req = makeRequest("/api/public/health", "www.deelrxcrm.app");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it.each([
    ["/privacy", "https://www.deelrxcrm.com/legal/privacy"],
    ["/privacy-policy", "https://www.deelrxcrm.com/legal/privacy"],
    ["/legal/privacy", "https://www.deelrxcrm.com/legal/privacy"],
    ["/terms", "https://www.deelrxcrm.com/legal/terms"],
    ["/legal/terms", "https://www.deelrxcrm.com/legal/terms"],
    ["/support", "https://www.deelrxcrm.com/support"],
  ])("redirects public policy route %s to %s", async (pathname, target) => {
    const req = makeRequest(pathname, "www.deelrxcrm.app");
    const res = await runMiddleware(req, { userId: null });
    expect(res.status).toBe(308);
    expect(res.headers.get("location")).toBe(target);
  });

  it("passes through Next.js internal assets", async () => {
    const req = makeRequest("/_next/static/chunks/main.js", "www.deelrxcrm.app");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("redirects marketing sign-in route to app sign-in", async () => {
    const req = makeRequest("/sign-in", "deelrxcrm.com");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("location")).toBe("https://www.deelrxcrm.app/sign-in");
  });
});
