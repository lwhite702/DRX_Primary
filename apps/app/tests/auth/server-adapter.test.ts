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

import { auth, hasClerkServerEnv } from "@/lib/adapters/auth/server";

describe("server auth adapter", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "development");
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
});
