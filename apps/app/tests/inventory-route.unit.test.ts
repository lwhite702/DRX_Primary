import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ query: vi.fn(), mutation: vi.fn(), token: vi.fn() }));
vi.mock("@/lib/db", () => { throw new Error("Inventory routes must not import Prisma"); });
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; mutation = mocks.mutation; } }));
import { GET, PUT } from "@/app/api/inventory/[id]/route";
import { POST as adjust } from "@/app/api/inventory/adjust/route";
import { GET as audit } from "@/app/api/inventory/audit/route";
const request = (method = "GET", body?: object, extra = {}) => new NextRequest("https://example.test/api/inventory/product", {
  method, headers: { "x-business-id": "tenant", ...extra }, body: body ? JSON.stringify(body) : undefined,
});
const context = { params: Promise.resolve({ id: "product" }) };
beforeEach(() => {
  vi.clearAllMocks();
  process.env.NEXT_PUBLIC_CONVEX_URL = "https://synthetic.convex.cloud";
  mocks.token.mockResolvedValue("synthetic-token");
  mocks.query.mockResolvedValue({ _id: "product", businessId: "tenant", productName: "Synthetic", sku: "SKU",
    quantityOnHandGrams: 10, reorderLevelGrams: 1, sellingPriceCents: 200, unitCostCents: 100, sellingUnit: "g", createdAt: 1, updatedAt: 2 });
});
describe("Convex inventory routes", () => {
  it("awaits Next async params and returns canonical stock", async () => {
    expect((await (await GET(request(), context)).json()).data).toMatchObject({ id: "product", quantityOnHand: 10 });
    expect(mocks.query).toHaveBeenCalledWith(expect.anything(), { businessId: "tenant", productId: "product" });
  });
  it("converts price units and preserves fractional product edits", async () => {
    const response = await PUT(request("PUT", { product_name: "Updated", quantity_on_hand: 2.5, selling_price: 3.25 }), context);
    expect(response.status).toBe(200);
    expect(mocks.mutation).toHaveBeenCalledWith(expect.anything(), expect.objectContaining({ productId: "product", businessId: "tenant", quantity: 2.5, sellingPriceCents: 325 }));
  });
  it("rejects changed identities and malformed amounts before mutation", async () => {
    expect((await PUT(request("PUT", { business_id: "other" }), context)).status).toBe(409);
    expect((await PUT(request("PUT", { selling_price: 1.001 }), context)).status).toBe(400);
    expect(mocks.mutation).not.toHaveBeenCalled();
  });
  it("requires the adjustment request key and returns safe permission errors", async () => {
    const body = { inventory_id: "product", type: "delta", value: 2, reason: "Count correction" };
    expect((await adjust(request("POST", body))).status).toBe(400);
    mocks.mutation.mockRejectedValue(new Error("FORBIDDEN: private provider details"));
    const response = await adjust(request("POST", body, { "idempotency-key": "retry-key" }));
    expect(response.status).toBe(403);
    expect(JSON.stringify(await response.json())).not.toContain("private provider details");
  });
  it("reads audit using the selected business and rejects unsigned requests", async () => {
    mocks.query.mockResolvedValue([]);
    expect((await audit(request())).status).toBe(200);
    expect(mocks.query).toHaveBeenCalledWith(expect.anything(), { businessId: "tenant" });
    mocks.token.mockResolvedValue(null);
    expect((await GET(request(), context)).status).toBe(401);
  });
});
