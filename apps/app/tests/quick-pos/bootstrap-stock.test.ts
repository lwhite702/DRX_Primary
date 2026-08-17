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
  },
}));

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
  toNumber: (value: unknown) => Number(value ?? 0),
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { GET } from "@/app/api/pos/bootstrap/route";

describe("quick POS bootstrap stock metadata", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "user_1",
      businessId: "business_1",
    });
    mocks.db.salesLineItem.groupBy.mockResolvedValue([
      { inventoryId: "inventory_1", _sum: { quantity: 4 } },
    ]);
    mocks.db.inventory.findMany.mockResolvedValue([
      {
        id: "inventory_1",
        productName: "Sold Out Favorite",
        sku: "SO-1",
        sellingPrice: 12,
        quantityOnHand: 0,
      },
    ]);
    mocks.db.salesLineItem.findMany.mockResolvedValue([
      {
        inventoryId: "inventory_1",
        inventory: {
          id: "inventory_1",
          productName: "Sold Out Favorite",
          sku: "SO-1",
          sellingPrice: 12,
          quantityOnHand: 0,
        },
      },
    ]);
    mocks.db.creditLimit.count.mockResolvedValue(0);
  });

  it("includes on-hand quantity for favorites and recently sold items", async () => {
    const response = await GET();
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.favorites[0]).toMatchObject({
      id: "inventory_1",
      quantity_on_hand: 0,
    });
    expect(payload.recentlySold[0]).toMatchObject({
      id: "inventory_1",
      quantity_on_hand: 0,
    });
  });
});
