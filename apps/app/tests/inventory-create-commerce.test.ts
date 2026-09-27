import { NextRequest } from "next/server";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { creationCommerceDefaults } from "../lib/commerce/product-creation";
const mocks = vi.hoisted(() => ({ query: vi.fn(), mutation: vi.fn(), token: vi.fn() }));
vi.mock("@/lib/db", () => { throw new Error("Catalog must not load Prisma"); });
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class {
  setAuth() {} query = mocks.query; mutation = mocks.mutation;
} }));
import { GET, POST } from "../app/api/inventory/route";
const product = {
  _id: "canonical-product", businessId: "canonical-business", sku: "NEW", productName: "Synthetic",
  quantityOnHandGrams: 2.5, reorderLevelGrams: 0, sellingPriceCents: 1000, unitCostCents: 300,
  sellingUnit: "g", allowFractionalWeight: true, createdAt: 1, updatedAt: 2,
};
const body = { business_id: "canonical-business", sku: "NEW", product_name: "Synthetic", selling_price: 10,
  unit_cost: 3, quantity_on_hand: 2.5, reorder_level: 0, commerce_config: creationCommerceDefaults("g", true) };
const request = (patch = {}) => new NextRequest("https://example.test/api/inventory", {
  method: "POST", body: JSON.stringify({ ...body, ...patch }),
});
beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_CONVEX_URL = "https://synthetic.convex.cloud";
  mocks.token.mockResolvedValue("synthetic-token");
  mocks.mutation.mockResolvedValue(product._id);
  mocks.query.mockResolvedValue(product);
});
describe("Convex catalog adapter", () => {
  it("creates canonical stock and selling rules and returns the operator row", async () => {
    const response = await POST(request());
    expect(response.status).toBe(201);
    expect(mocks.mutation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      selectedBusinessId: body.business_id, sellingPriceCents: 1000, unitCostCents: 300, initialQuantity: 2.5,
      commerceConfig: expect.objectContaining({ sellingUnit: "g" }),
    }));
    expect(await response.json()).toMatchObject({ id: product._id, quantityOnHand: 2.5, sellingPrice: 10 });
  });
  it("passes automatic SKU and purchase basis to the server without a rounded client cost", async () => {
    const response = await POST(request({ sku: "", barcode: "012345678905", unit_cost: undefined,
      purchase_cost_basis: { costCents: 16000, quantity: 1, unit: "oz" },
    }));
    expect(response.status).toBe(201);
    expect(mocks.mutation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({
      sku: "", barcode: "012345678905", unitCostCents: 0,
      purchaseCostBasis: { costCents: 16000, quantity: 1, unit: "oz" },
    }));
  });
  it("rejects excess money precision and duplicate SKU without hiding the conflict", async () => {
    expect((await POST(request({ selling_price: 1.001 }))).status).toBe(400);
    expect(mocks.mutation).not.toHaveBeenCalled();
    mocks.mutation.mockRejectedValue(new Error("ALREADY_EXISTS: private identifier"));
    const response = await POST(request());
    expect(response.status).toBe(409);
    expect(JSON.stringify(await response.json())).not.toContain("private identifier");
  });
  it("reads canonical stock through bounded pages, preserving search and offset", async () => {
    mocks.query.mockResolvedValueOnce({ page: [product], continueCursor: "next", isDone: false })
      .mockResolvedValueOnce({ page: [{ ...product, _id: "second" }], continueCursor: "end", isDone: true });
    const response = await GET(new NextRequest("https://example.test/api/inventory?business_id=canonical-business&limit=1&offset=1&search=synthetic"));
    expect(response.status).toBe(200);
    expect((await response.json()).data).toEqual([expect.objectContaining({ id: "second", quantityOnHand: 2.5 })]);
    expect(mocks.query).toHaveBeenLastCalledWith(expect.anything(), { businessId: body.business_id, paginationOpts: { numItems: 1, cursor: "next" } });
  });
  it("requires identity and selected tenant before any catalog call", async () => {
    mocks.token.mockResolvedValue(null);
    expect((await POST(request())).status).toBe(401);
    expect(mocks.mutation).not.toHaveBeenCalled();
    mocks.token.mockResolvedValue("synthetic-token");
    expect((await GET(new NextRequest("https://example.test/api/inventory"))).status).toBe(400);
    expect(mocks.query).not.toHaveBeenCalled();
  });
});
