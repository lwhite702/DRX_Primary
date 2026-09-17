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
import { setupBusinessSchema } from "@/lib/onboarding/setup-schema";

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
        setupJson: expect.any(String),
      }),
    );
    const calledArgs = mocks.provisionBusinessInConvex.mock.calls[0][0];
    expect(calledArgs.setup).toBeUndefined();
    const parsedSetup = JSON.parse(calledArgs.setupJson);
    expect(() => setupBusinessSchema.parse(parsedSetup)).not.toThrow();
    expect(parsedSetup).toMatchObject({
      businessName: "Convex Market",
      businessType: "retail",
      ownerName: "Store Owner",
      city: "Albany",
      state: "NY",
      zipCode: "12207",
      defaultUnit: "g",
    });
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/");
  });

  it("forwards managerPin when configured during onboarding", async () => {
    await setupBusinessAction({
      businessName: "Secure POS Store",
      businessType: "retail",
      address: "123 Main St",
      city: "Albany",
      state: "NY",
      zipCode: "12207",
      ownerPhone: "5555550100",
      defaultUnit: "g",
      quickQuantities: [],
      privacyPreset: "standard_mode",
      inventoryReasons: [],
      nicknames: [],
      ownerName: "Store Owner",
      managerPin: "4829",
    });

    expect(mocks.provisionBusinessInConvex).toHaveBeenCalledWith(
      expect.objectContaining({
        businessName: "Secure POS Store",
        setupJson: expect.any(String),
      }),
    );
    const pinArgs = mocks.provisionBusinessInConvex.mock.calls[0][0];
    const pinSetup = JSON.parse(pinArgs.setupJson);
    expect(pinSetup.managerPin).toBe("4829");
  });

  it("surfaces sanitized Convex validation error messages", async () => {
    mocks.provisionBusinessInConvex.mockRejectedValue(
      new Error("INVALID_ARGUMENT: Conflicting business name"),
    );

    const result = await setupBusinessAction({
      businessName: "Mismatch Store",
      businessType: "retail",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      ownerPhone: "",
      defaultUnit: "g",
      quickQuantities: [],
      privacyPreset: "standard_mode",
      inventoryReasons: [],
      nicknames: [],
      ownerName: "Owner",
    });

    expect(result).toEqual({
      error: "Conflicting business name",
    });
  });

  it("handles BUSINESS_MISSING status response", async () => {
    mocks.provisionBusinessInConvex.mockResolvedValue({
      businessId: "convex_business_123",
      status: "BUSINESS_MISSING",
    });

    const result = await setupBusinessAction({
      businessName: "Missing Store",
      businessType: "retail",
      address: "",
      city: "",
      state: "",
      zipCode: "",
      ownerPhone: "",
      defaultUnit: "g",
      quickQuantities: [],
      privacyPreset: "standard_mode",
      inventoryReasons: [],
      nicknames: [],
      ownerName: "Owner",
    });

    expect(result).toEqual({
      error: "Business configuration could not be verified. Please reload and try again.",
    });
  });
});


