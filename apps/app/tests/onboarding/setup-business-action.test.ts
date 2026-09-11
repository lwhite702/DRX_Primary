import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  provisionBusinessInConvex: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("@/lib/adapters/auth/server", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/convex/onboarding-server", () => ({
  provisionBusinessInConvex: mocks.provisionBusinessInConvex,
}));

vi.mock("next/cache", () => ({
  revalidatePath: mocks.revalidatePath,
}));

import { setupBusinessAction } from "@/app/actions/setup-business";

describe("setupBusinessAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({ orgId: "org_123" });
    mocks.provisionBusinessInConvex.mockResolvedValue({
      businessId: "convex_business_123",
      status: "ONBOARDING_SUCCESS",
    });
  });

  it("provisions the legacy dashboard wizard through Convex", async () => {
    await expect(
      setupBusinessAction({
        businessName: "Convex Market",
        businessType: "retail",
        address: "123 Main St",
        city: "Albany",
        state: "NY",
        zipCode: "12207",
        ownerPhone: "5555550100",
        defaultUnit: "g",
        quickQuantities: [{ label: "1g", value: 1, unit: "g" }],
        privacyPreset: "standard_mode",
        inventoryReasons: [{ label: "Restock", type: "positive" }],
        nicknames: [{ slang: "Eighth", quantity: 3.5, unit: "g" }],
        ownerName: "Store Owner",
      }),
    ).resolves.toEqual({
      success: true,
      businessId: "convex_business_123",
    });

    expect(mocks.provisionBusinessInConvex).toHaveBeenCalledWith(
      expect.objectContaining({
        businessName: "Convex Market",
        businessType: "retail",
        clerkOrgId: "org_123",
        name: "Store Owner",
        setup: expect.objectContaining({
          city: "Albany",
          region: "NY",
          defaultUnit: "g",
        }),
      }),
    );
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });
});
