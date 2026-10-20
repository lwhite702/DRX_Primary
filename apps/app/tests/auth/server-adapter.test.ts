import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  clerkAuth: vi.fn(),
}));

vi.mock("@clerk/nextjs/server", () => ({
  auth: mocks.clerkAuth,
  clerkClient: vi.fn(),
  clerkMiddleware: vi.fn(),
  createRouteMatcher: vi.fn(),
}));

import {
  auth,
  hasClerkServerEnv,
  isClerkServerConfigured,
  isTrueProductionEnvironment,
} from "@/lib/adapters/auth/server";

describe("server auth adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("VERCEL_ENV", "");
    vi.stubEnv("NEXT_PUBLIC_APP_URL", "");
    vi.stubEnv("BYPASS_AUTH_FOR_TESTING", "false");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("CLERK_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
  });

  it("returns a signed-out state when Clerk is not configured", async () => {
    expect(hasClerkServerEnv()).toBe(false);

    const result = await auth();

    expect(result.userId).toBeNull();
    expect(result.orgId).toBeNull();
    expect(result.sessionId).toBeNull();
    await expect(result.getToken()).resolves.toBeNull();
    expect(mocks.clerkAuth).not.toHaveBeenCalled();
  });

  it("delegates to Clerk when server credentials are configured", async () => {
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_configured");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_configured");
    mocks.clerkAuth.mockResolvedValue({ userId: "user_configured" });

    expect(hasClerkServerEnv()).toBe(true);
    await expect(auth()).resolves.toMatchObject({ userId: "user_configured" });
    expect(mocks.clerkAuth).toHaveBeenCalledOnce();
  });

  it("returns a signed-out state in Vercel preview environments without throwing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");

    expect(isTrueProductionEnvironment()).toBe(false);
    expect(isClerkServerConfigured()).toBe(false);
    expect(hasClerkServerEnv()).toBe(false);

    const result = await auth();
    expect(result.userId).toBeNull();
    expect(result.orgId).toBeNull();
    expect(mocks.clerkAuth).not.toHaveBeenCalled();
  });

  it("treats NODE_ENV=production with VERCEL_ENV unset as true production", () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "");

    expect(isTrueProductionEnvironment()).toBe(true);
  });

  it("throws in true production environment when Clerk keys are missing", async () => {
    vi.stubEnv("NODE_ENV", "production");
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");

    expect(isTrueProductionEnvironment()).toBe(true);
    expect(hasClerkServerEnv()).toBe(false);

    await expect(auth()).rejects.toThrow(
      "[auth] Clerk server and publishable keys are required in production.",
    );
  });

  it("falls back gracefully when clerkAuth throws in non-production", async () => {
    vi.stubEnv("NODE_ENV", "development");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_123");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_123");
    mocks.clerkAuth.mockRejectedValue(new Error("Clerk API timeout"));

    const result = await auth();
    expect(result.userId).toBeNull();
    expect(mocks.clerkAuth).toHaveBeenCalledOnce();
  });
});
