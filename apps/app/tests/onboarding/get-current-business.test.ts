import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  isAuthBypassEnabled: vi.fn(),
  getBusinessProfileFromConvex: vi.fn(),
}));

vi.mock("@/lib/adapters/auth/server", () => ({
  auth: mocks.auth,
  isAuthBypassEnabled: mocks.isAuthBypassEnabled,
}));

vi.mock("@/lib/convex/onboarding-server", () => ({
  getBusinessProfileFromConvex: mocks.getBusinessProfileFromConvex,
}));

import { getCurrentBusinessProfile } from "@/app/actions/get-current-business";

describe("getCurrentBusinessProfile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.isAuthBypassEnabled.mockReturnValue(false);
  });

  it("keeps synthetic authenticated checks out of the real onboarding flow", async () => {
    mocks.isAuthBypassEnabled.mockReturnValue(true);
    mocks.auth.mockResolvedValue({
      userId: "user_required_ux",
      orgId: "org_required_ux",
    });

    await expect(getCurrentBusinessProfile()).resolves.toMatchObject({
      id: "org_required_ux",
      clerkOrgId: "org_required_ux",
      role: "super_admin",
      businessName: "Local Business",
    });
    expect(mocks.getBusinessProfileFromConvex).not.toHaveBeenCalled();
  });

  it("uses Convex for normal authenticated requests", async () => {
    mocks.getBusinessProfileFromConvex.mockResolvedValue({
      id: "business_123",
      businessName: "Convex Market",
      settingsData: JSON.stringify({ city: "Albany", region: "NY" }),
    });

    await expect(getCurrentBusinessProfile()).resolves.toMatchObject({
      id: "business_123",
      businessName: "Convex Market",
      city: "Albany",
      state: "NY",
    });
  });
});
