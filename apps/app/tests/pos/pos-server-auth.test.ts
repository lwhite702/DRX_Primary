import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  token: vi.fn(),
  query: vi.fn(),
}));

vi.mock("@/lib/auth/convex-token", () => ({
  getConvexAuthToken: mocks.token,
}));

vi.mock("convex/browser", () => ({
  ConvexHttpClient: class {
    setAuth() {}
    query = mocks.query;
  },
}));

import { resolveAuthContext, assertBusinessAccess } from "@/app/api/pos/_lib/server";

describe("POS server auth context resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.token.mockResolvedValue(null);
    mocks.query.mockReset();
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud");
    vi.stubEnv("BYPASS_AUTH_FOR_TESTING", "");
    vi.stubEnv("DANGEROUS_BYPASS_AUTH_FOR_TESTING_ONLY", "");
    vi.stubEnv("BYPASS_AUTH_USER_ID", "");
    vi.stubEnv("BYPASS_AUTH_ORG_ID", "");
    vi.stubEnv("PREVIEW_TEST_SECRET", "");
    vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", "");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("fails closed for ordinary anonymous requests in preview without Clerk", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    mocks.token.mockResolvedValue(null);

    const request = new Request("http://localhost/api/pos/quote", {
      headers: { "x-business-id": "spoofed-tenant-id" },
    });

    const result = await resolveAuthContext(request);
    expect(result).toEqual({ userId: null, businessId: null });
  });

  it("grants fixed synthetic tenant to authorized preview runners with protection bypass", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", "automation-bypass-secret");

    const request = new Request("http://localhost/api/pos/quote", {
      headers: {
        "x-vercel-protection-bypass": "automation-bypass-secret",
        "x-business-id": "attacker-chosen-tenant",
      },
    });

    const result = await resolveAuthContext(request);
    expect(result).toEqual({ userId: "preview_tester", businessId: "preview_org" });
  });

  it("grants fixed synthetic tenant with preview test secret token", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    vi.stubEnv("PREVIEW_TEST_SECRET", "custom-preview-secret");

    const request = new Request("http://localhost/api/pos/quote", {
      headers: {
        "x-preview-test-token": "custom-preview-secret",
      },
    });

    const result = await resolveAuthContext(request);
    expect(result).toEqual({ userId: "preview_tester", businessId: "preview_org" });
  });

  it("goes through Convex when Clerk is configured in preview", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("CLERK_SECRET_KEY", "sk_test_123");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_123");
    mocks.token.mockResolvedValue("signed-clerk-token");
    mocks.query.mockResolvedValue({ userId: "clerk-user-456", businessId: "real-biz-123" });

    const request = new Request("http://localhost/api/pos/quote");
    const result = await resolveAuthContext(request);
    expect(result).toEqual({ userId: "clerk-user-456", businessId: "real-biz-123" });
    expect(mocks.query).toHaveBeenCalled();
  });

  it("restricts assertBusinessAccess to fixed tenant in preview without Clerk", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");

    expect(await assertBusinessAccess("preview_tester", "preview_org")).toBe(true);
    expect(await assertBusinessAccess("preview_tester", "other_tenant")).toBe(false);
    expect(await assertBusinessAccess("other_user", "preview_org")).toBe(false);
  });

  it("fails closed when called without request in preview without Clerk and no secret set", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");

    const result = await resolveAuthContext();
    expect(result).toEqual({ userId: null, businessId: null });
  });

  it("authenticates no-request calls when next/headers provides preview test token", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("CLERK_SECRET_KEY", "");
    vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
    vi.stubEnv("PREVIEW_TEST_SECRET", "header-test-secret");

    vi.doMock("next/headers", () => ({
      headers: async () => ({
        get: (name: string) => (name === "x-preview-test-token" ? "header-test-secret" : null),
      }),
    }));

    const result = await resolveAuthContext();
    expect(result).toEqual({ userId: "preview_tester", businessId: "preview_org" });
  });
});
