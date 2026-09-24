import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ businessClient: vi.fn(), query: vi.fn() }));

vi.mock("@/lib/business/convex-server", () => ({
  businessClient: mocks.businessClient,
}));

import { hasConfiguredCanonicalCommerce } from "@/app/api/pos/_lib/commerce-routing";
import { getDefaultCommerceSettings } from "@/lib/commerce/config";

describe("server-owned commerce routing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.businessClient.mockResolvedValue({ client: { query: mocks.query } });
  });

  it("detects a whole-unit bulk tier from tenant settings", async () => {
    const commerce = getDefaultCommerceSettings();
    commerce.productConfigs["22222222-2222-4222-8222-222222222222"] = {
      fractionalEnabled: false,
      sellingUnit: "case",
      decimalPrecision: 0,
      minimumSaleQuantity: 1,
      quantityIncrement: 1,
      suggestedDollarAmounts: [50],
      suggestedQuantities: [1, 6, 12],
      bulkPriceTiers: [
        {
          id: "case-12",
          label: "12+ cases",
          minimumQuantity: 12,
          unitPrice: 8,
        },
      ],
    };
    mocks.query.mockResolvedValue({ page: [{ _id: "22222222-2222-4222-8222-222222222222", allowFractionalWeight: false, bulkPriceTiers: commerce.productConfigs["22222222-2222-4222-8222-222222222222"].bulkPriceTiers }] });

    await expect(
      hasConfiguredCanonicalCommerce("tenant-a", [
        {
          inventoryId: "22222222-2222-4222-8222-222222222222",
          source: "inventory",
        },
      ]),
    ).resolves.toBe(true);
  });

  it("does not route an unrelated product from another config entry", async () => {
    const commerce = getDefaultCommerceSettings();
    commerce.productConfigs["33333333-3333-4333-8333-333333333333"] = {
      fractionalEnabled: false,
      sellingUnit: "unit",
      decimalPrecision: 0,
      minimumSaleQuantity: 1,
      quantityIncrement: 1,
      suggestedDollarAmounts: [10],
      suggestedQuantities: [1],
      bulkPriceTiers: [
        { id: "bulk", label: "Bulk", minimumQuantity: 5, unitPrice: 4 },
      ],
    };
    mocks.query.mockResolvedValue({ page: [{ _id: "33333333-3333-4333-8333-333333333333", allowFractionalWeight: false, bulkPriceTiers: commerce.productConfigs["33333333-3333-4333-8333-333333333333"].bulkPriceTiers }] });

    await expect(
      hasConfiguredCanonicalCommerce("tenant-a", [
        {
          inventoryId: "22222222-2222-4222-8222-222222222222",
          source: "inventory",
        },
      ]),
    ).resolves.toBe(false);
  });
});
