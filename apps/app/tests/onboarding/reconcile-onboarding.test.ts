import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getCompletedBusinessId: vi.fn(),
  updateUser: vi.fn(),
}));

vi.mock("@/lib/adapters/auth/server", () => ({
  auth: mocks.auth,
  clerkClient: vi.fn(async () => ({
    users: {
      updateUser: mocks.updateUser,
    },
  })),
  isAuthBypassEnabled: vi.fn(() => false),
}));

vi.mock("@/lib/auth/onboarding-state", () => ({
  getCompletedOnboardingBusinessId: mocks.getCompletedBusinessId,
}));

import { GET } from "@/app/api/onboarding/reconcile/route";

describe("GET /api/onboarding/reconcile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      userId: "user_123",
      sessionClaims: { publicMetadata: { existing: "kept" } },
    });
    mocks.getCompletedBusinessId.mockResolvedValue("business_123");
  });

  it("repairs a completed operator session and redirects to the sale workspace", async () => {
    const response = await GET(
      new Request("https://www.deelrxcrm.app/api/onboarding/reconcile"),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://www.deelrxcrm.app/dashboard");
    expect(response.headers.get("set-cookie")).toContain("drx_onboarding_complete=true");
    expect(mocks.updateUser).toHaveBeenCalledWith("user_123", {
      publicMetadata: {
        existing: "kept",
        onboardingComplete: true,
        businessId: "business_123",
      },
    });
  });

  it("keeps incomplete accounts in onboarding", async () => {
    mocks.getCompletedBusinessId.mockResolvedValue(null);

    const response = await GET(
      new Request("https://www.deelrxcrm.app/api/onboarding/reconcile"),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://www.deelrxcrm.app/onboarding");
    expect(mocks.updateUser).not.toHaveBeenCalled();
  });

  it("sends signed-out requests to login", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const response = await GET(
      new Request("https://www.deelrxcrm.app/api/onboarding/reconcile"),
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe("https://www.deelrxcrm.app/login");
  });
});
