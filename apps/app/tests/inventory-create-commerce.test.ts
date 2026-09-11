import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { creationCommerceDefaults } from "../lib/commerce/product-creation";
import { getDefaultCommerceSettings } from "../lib/commerce/config";
const mocks = vi.hoisted(() => {
  const tx = {
    inventory: { create: vi.fn() },
    businessSettings: { findUnique: vi.fn(), upsert: vi.fn() },
    inventoryLog: { create: vi.fn() },
    user: { findFirst: vi.fn() },
  };
  return {
    tx,
    auth: vi.fn(),
    permission: vi.fn(),
    transaction: vi.fn((fn: (tx: unknown) => unknown) => fn(tx)),
  };
});
vi.mock("@/lib/db", () => ({
  db: { ...mocks.tx, $transaction: mocks.transaction },
}));
vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.auth,
}));
vi.mock("@/lib/auth/server-guards", () => ({
  hasBusinessPermission: mocks.permission,
}));
import { POST } from "../app/api/inventory/route";
const id = "11111111-1111-4111-8111-111111111111";
const body = {
  sku: "NEW",
  product_name: "Synthetic",
  selling_price: 10,
  unit_cost: 3,
  quantity_on_hand: 2,
  reorder_level: 0,
  commerce_config: {
    ...creationCommerceDefaults("g", true),
    suggestedDollarAmounts: [10, 20],
    suggestedQuantities: [0.5, 1],
  },
};
const request = (patch = {}) =>
  new NextRequest("https://example.test/api/inventory", {
    method: "POST",
    body: JSON.stringify({ ...body, ...patch }),
  });
beforeEach(() => {
  vi.clearAllMocks();
  mocks.auth.mockResolvedValue({ userId: "owner", businessId: "tenant-a" });
  mocks.permission.mockResolvedValue(true);
  mocks.tx.inventory.create.mockImplementation(async ({ data }) => ({
    id,
    ...data,
  }));
  mocks.tx.businessSettings.findUnique.mockResolvedValue({
    settingsData: {
      unrelated: "preserved",
      commerce: getDefaultCommerceSettings(),
    },
  });
  mocks.tx.businessSettings.upsert.mockResolvedValue({});
});
describe("inventory creation with selling rules", () => {
  it("writes product, quantity rules and audit in one serializable tenant-scoped transaction", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(mocks.transaction).toHaveBeenCalledWith(expect.any(Function), {
      isolationLevel: "Serializable",
    });
    expect(mocks.tx.inventory.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        businessId: "tenant-a",
        allowFractionalWeight: true,
        pricePerGram: 10,
        inventoryInGrams: 2,
        reorderLevel: 0,
      }),
    });
    expect(mocks.tx.businessSettings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: "tenant-a" },
        update: {
          settingsData: expect.objectContaining({
            unrelated: "preserved",
            commerce: expect.objectContaining({
              productConfigs: { [id]: body.commerce_config },
            }),
          }),
        },
      }),
    );
    expect(mocks.tx.inventoryLog.create).toHaveBeenCalledOnce();
  });
  it.each([
    { quantityIncrement: 0 },
    { decimalPrecision: 0 },
    { suggestedQuantities: [0.005] },
    { suggestedDollarAmounts: [10.001] },
  ])("rejects invalid config before writes: %j", async (patch) => {
    expect(
      (
        await POST(
          request({ commerce_config: { ...body.commerce_config, ...patch } }),
        )
      ).status,
    ).toBe(400);
    expect(mocks.tx.inventory.create).not.toHaveBeenCalled();
  });
  it("does not claim success if saving the rules fails", async () => {
    mocks.tx.businessSettings.upsert.mockRejectedValueOnce(
      new Error("Synthetic write failure"),
    );
    expect((await POST(request())).status).toBe(500);
  });
  it("does not replace malformed existing commerce settings", async () => {
    mocks.tx.businessSettings.findUnique.mockResolvedValueOnce({
      settingsData: { commerce: { invalid: true } },
    });
    expect((await POST(request())).status).toBe(500);
    expect(mocks.tx.businessSettings.upsert).not.toHaveBeenCalled();
    expect(mocks.tx.inventoryLog.create).not.toHaveBeenCalled();
  });
  it("reports a retryable conflict without claiming a successful create", async () => {
    mocks.transaction.mockImplementationOnce(async () => {
      throw { code: "P2034" };
    });
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(await response.json()).toMatchObject({
      error: expect.stringContaining("please try again"),
    });
  });
  it("denies unauthorized roles before any writes", async () => {
    mocks.permission.mockResolvedValue(false);
    expect((await POST(request())).status).toBe(403);
    expect(mocks.transaction).not.toHaveBeenCalled();
  });
  it("preserves whole-unit defaults and legacy requests", async () => {
    expect(
      (
        await POST(
          request({ commerce_config: creationCommerceDefaults("unit") }),
        )
      ).status,
    ).toBe(201);
    expect(mocks.tx.inventory.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({
        allowFractionalWeight: false,
        pricePerGram: null,
      }),
    });
    expect((await POST(request({ commerce_config: undefined }))).status).toBe(
      201,
    );
    expect(mocks.transaction).toHaveBeenCalledTimes(1);
  });
  it("resolves Clerk userId to user UUID for inventoryLog and accepts null unit_cost", async () => {
    const internalUserUuid = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
    mocks.auth.mockResolvedValueOnce({
      userId: "user_2w3xyz987clerk",
      businessId: "tenant-a",
    });
    mocks.tx.user.findFirst.mockResolvedValueOnce({ id: internalUserUuid });

    const response = await POST(request({ unit_cost: null }));
    expect(response.status).toBe(201);
    expect(mocks.tx.inventory.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          unitCost: null,
        }),
      }),
    );
    expect(mocks.tx.inventoryLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          createdBy: internalUserUuid,
        }),
      }),
    );
  });
});
