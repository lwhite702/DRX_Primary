import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resolveAuthContext: vi.fn(),
  db: {
    salesLineItem: {
      groupBy: vi.fn(),
      findMany: vi.fn(),
    },
    inventory: {
      findMany: vi.fn(),
    },
    creditLimit: {
      count: vi.fn(),
    },
    businessSettings: {
      findUnique: vi.fn(),
    },
  },
}));

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
  toNumber: (value: unknown) => Number(value ?? 0),
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { GET } from "@/app/api/pos/bootstrap/route";

const INVENTORY_ID = "22222222-2222-4222-8222-222222222222";

describe("quick POS bootstrap stock metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "user_1",
      businessId: "business_1",
    });
    mocks.db.salesLineItem.groupBy.mockResolvedValue([
      { inventoryId: INVENTORY_ID, _sum: { quantity: 4 } },
    ]);
    mocks.db.inventory.findMany.mockResolvedValue([
      {
        id: INVENTORY_ID,
        productName: "Sold Out Favorite",
        sku: "SO-1",
        sellingPrice: 12,
        quantityOnHand: 0,
      },
    ]);
    mocks.db.salesLineItem.findMany.mockResolvedValue([
      {
        inventoryId: INVENTORY_ID,
        inventory: {
          id: INVENTORY_ID,
          productName: "Sold Out Favorite",
          sku: "SO-1",
          sellingPrice: 12,
          quantityOnHand: 0,
        },
      },
    ]);
    mocks.db.creditLimit.count.mockResolvedValue(0);
    mocks.db.businessSettings.findUnique.mockResolvedValue(null);
  });

  it("includes on-hand quantity for favorites and recently sold items", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.favorites[0]).toMatchObject({
      id: INVENTORY_ID,
      quantity_on_hand: 0,
    });
    expect(payload.recentlySold[0]).toMatchObject({
      id: INVENTORY_ID,
      quantity_on_hand: 0,
    });
  });

  it("keeps whole-unit bulk configuration visible to the register", async () => {
    mocks.db.businessSettings.findUnique.mockResolvedValue({
      settingsData: {
        commerce: {
          merchant: {
            loyaltyCombinationPolicy: "best_only",
            loyaltyTiers: [],
            deliveryFeeTaxable: false,
            dispatchSlaMinutes: 5,
            escalationDelayMinutes: 10,
            managerNotificationTargets: [],
          },
          productConfigs: {
            [INVENTORY_ID]: {
              fractionalEnabled: false,
              sellingUnit: "case",
              decimalPrecision: 0,
              minimumSaleQuantity: 1,
              quantityIncrement: 1,
              suggestedDollarAmounts: [50],
              suggestedQuantities: [1, 12],
              bulkPriceTiers: [
                {
                  id: "case-12",
                  label: "12+ cases",
                  minimumQuantity: 12,
                  unitPrice: 8,
                },
              ],
            },
          },
        },
      },
    });

    const response = await GET();
    const payload = await response.json();

    expect(payload.favorites[0]).toMatchObject({
      commerce_config: {
        fractionalEnabled: false,
        sellingUnit: "case",
        bulkPriceTiers: [
          expect.objectContaining({ minimumQuantity: 12, unitPrice: 8 }),
        ],
      },
    });
    expect(payload.favorites[0]).not.toHaveProperty("fractional_config");
  });
});
