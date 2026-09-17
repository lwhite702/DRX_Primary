import { beforeEach, describe, expect, it, vi } from "vitest";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";

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

import { config, proxy } from "@/proxy";
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
  it.each(["/admin", "/admin/users", "/admin/approvals"])("retires %s without disclosing a replacement", async path => {
    const res = await runMiddleware(makeRequest(path, "deelrxcrm.app"), { userId: "owner" });
    expect(res.status).toBe(404);
    expect(res.headers.get("location")).toBeNull();
  });

  it("does not require business onboarding for the configured platform entry", async () => {
    const key = "a".repeat(32);
    vi.stubEnv("PLATFORM_CONSOLE_SLUG", key);
    try {
      const res = await runMiddleware(makeRequest(`/control/${key}`, "deelrxcrm.app"), { userId: "platform-user" });
      expect(res.headers.get("x-middleware-next")).toBe("1");
      expect(res.headers.get("cache-control")).toBe("private, no-store");
      expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    } finally { vi.unstubAllEnvs(); }
  });

  it("returns 404 for guessed platform entry without redirecting", async () => {
    const res = await runMiddleware(makeRequest("/control/admin", "deelrxcrm.app"), { userId: "owner" });
    expect(res.status).toBe(404);
    expect(res.headers.get("location")).toBeNull();
  });
  it("sends a signed-out private bookmark to its private sign-in page", async () => {
    const key = "a".repeat(32);
    vi.stubEnv("PLATFORM_CONSOLE_SLUG", key);
    try {
      const res = await runMiddleware(makeRequest(`/control/${key}`, "deelrxcrm.app"), { userId: null });
      expect(res.headers.get("location")).toBe(`https://deelrxcrm.app/control/${key}/sign-in`);
      expect(res.headers.get("cache-control")).toBe("private, no-store");
      expect(res.headers.get("referrer-policy")).toBe("no-referrer");
    } finally { vi.unstubAllEnvs(); }
  });
  it.each(["", "/factor-one", "/sso-callback"])("allows only the configured private sign-in step %s before login", async suffix => {
    const key = "a".repeat(32);
    vi.stubEnv("PLATFORM_CONSOLE_SLUG", key);
    try {
      const res = await runMiddleware(makeRequest(`/control/${key}/sign-in${suffix}`, "deelrxcrm.app"), { userId: null });
      expect(res.headers.get("x-middleware-next")).toBe("1");
      expect(res.headers.get("location")).toBeNull();
    } finally { vi.unstubAllEnvs(); }
  });
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

  it("redirects signed in users away from login to the dashboard when onboarding is complete", async () => {
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

  it("redirects signed in users from onboarding to the dashboard when onboarding is complete", async () => {
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

  it("returns JSON unauthorized for protected api routes", async () => {
    const req = makeRequest("/api/team", "deelrxcrm.app");
    const res = await runMiddleware(req, { userId: null });
    expect(res.status).toBe(401);
    expect(res.headers.get("content-type")).toContain("application/json");
    await expect(res.json()).resolves.toEqual({ error: "Unauthorized" });
  });

  it("passes through public auth-domain routes", async () => {
    const req = makeRequest("/sign-in", "accounts.deelrxcrm.app");
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
    const req = makeRequest("/api/public/health", "deelrxcrm.app");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it("passes through Next.js internal assets", async () => {
    const req = makeRequest("/_next/static/chunks/main.js", "deelrxcrm.app");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("x-middleware-next")).toBe("1");
  });

  it.each(["deelrxcrm.app", "accounts.deelrxcrm.app", "deelrxcrm.com"])(
    "rejects nested auth assets on %s before authentication",
    async (host) => {
      const req = makeRequest("/login/favicon.ico", host);
      const authenticate = vi.fn(async () => ({ userId: null }));
      const handler = proxy as unknown as (
        auth: () => Promise<AuthResult>,
        request: ReturnType<typeof makeRequest>,
      ) => Promise<Response>;
      const res = await handler(authenticate, req);

      expect(res.status).toBe(404);
      expect(authenticate).not.toHaveBeenCalled();
    },
  );

  it("redirects marketing sign-in route to app sign-in", async () => {
    const req = makeRequest("/sign-in", "deelrxcrm.com");
    const res = await runMiddleware(req, { userId: null });
    expect(res.headers.get("location")).toBe("https://deelrxcrm.app/sign-in");
  });
});

describe("middleware matcher", () => {
  it.each(["", "?verification=1"])("skips the exact ownership path%s before Clerk runs", (query) => {
    expect(unstable_doesMiddlewareMatch({
      config,
      nextConfig: {},
      url: `https://www.deelrxcrm.app/.well-known/replay-qa-security-nonce${query}`,
    })).toBe(false);
  });

  it.each([
    "/.well-known/other",
    "/.well-known/replay-qa-security-nonce-extra",
    "/.well-known/replay-qa-security-nonce/private",
    "/dashboard",
    "/api/team",
  ])("keeps auth middleware for %s", (pathname) => {
    expect(unstable_doesMiddlewareMatch({
      config,
      nextConfig: {},
      url: `https://www.deelrxcrm.app${pathname}`,
    })).toBe(true);
  });

  it.each([
    "/login/favicon.ico",
    "/register/logo.png",
    "/sign-in/favicon.ico",
    "/sign-up/logo.png",
    "/sso-callback/favicon.ico",
  ])(
    "runs Clerk middleware for nested auth asset path %s",
    (pathname) => {
      expect(
        unstable_doesMiddlewareMatch({
          config,
          nextConfig: {},
          url: `https://www.deelrxcrm.app${pathname}`,
        }),
      ).toBe(true);
    },
  );

  it("continues to skip real public static assets", () => {
    expect(
      unstable_doesMiddlewareMatch({
        config,
        nextConfig: {},
        url: "https://www.deelrxcrm.app/brand/favicon-32.png",
      }),
    ).toBe(false);
  });
});
