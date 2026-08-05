import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const { clerkAuth } = vi.hoisted(() => ({ clerkAuth: vi.fn() }));

vi.mock("@clerk/nextjs/server", () => ({
  auth: clerkAuth,
  clerkClient: vi.fn(),
  clerkMiddleware: vi.fn(),
  createRouteMatcher: vi.fn(),
}));

import {
  auth,
  getWorkflowSession,
  getWorkflowUserId,
  isClerkServerConfigured,
} from "@/lib/adapters/auth/server";

describe("server auth adapter", () => {
  beforeEach(() => {
    vi.stubEnv("BYPASS_AUTH_FOR_TESTING", "false");
    vi.stubEnv("NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING", "false");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("CLERK_PUBLISHABLE_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    clerkAuth.mockReset();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("detects complete Clerk server configuration", () => {
    expect(isClerkServerConfigured()).toBe(false);

    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_example");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_example");

    expect(isClerkServerConfigured()).toBe(true);
  });

  it("returns an anonymous auth state when Clerk is not configured", async () => {
    const state = (await auth()) as unknown as {
      userId: string | null;
      orgId: string | null;
      getToken: () => Promise<string | null>;
      has: () => boolean;
    };

    expect(state.userId).toBeNull();
    expect(state.orgId).toBeNull();
    await expect(state.getToken()).resolves.toBeNull();
    expect(state.has()).toBe(false);
    expect(clerkAuth).not.toHaveBeenCalled();
  });

  it("uses the test-only bypass identity when explicitly enabled", async () => {
    vi.stubEnv("BYPASS_AUTH_FOR_TESTING", "true");

    const state = (await auth()) as unknown as {
      userId: string;
      orgId: string;
      getToken: () => Promise<string>;
      has: () => boolean;
    };
    const session = await getWorkflowSession();

    expect(state.userId).toBe("11111111-1111-4111-8111-111111111111");
    expect(state.orgId).toBe("org_local_bypass");
    await expect(state.getToken()).resolves.toBe("bypass-token");
    expect(state.has()).toBe(true);
    expect(session.roles).toEqual(["super_admin"]);
    expect(clerkAuth).not.toHaveBeenCalled();
  });

  it("maps a configured Clerk session to the workflow contract", async () => {
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_example");
    vi.stubEnv("CLERK_PUBLISHABLE_KEY", "pk_test_example");
    clerkAuth.mockResolvedValue({
      userId: "user_123",
      orgId: "org_123",
      sessionClaims: { publicMetadata: { roles: ["admin"] } },
    });

    await expect(getWorkflowSession()).resolves.toEqual({
      userId: "user_123",
      tenantId: "org_123",
      roles: ["admin"],
    });
    await expect(getWorkflowUserId()).resolves.toBe("user_123");
    expect(clerkAuth).toHaveBeenCalledTimes(2);
  });
});
