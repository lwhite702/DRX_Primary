import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/db", () => { throw new Error("Stock check must not load Prisma"); });
vi.mock("@/app/api/pos/_lib/server", () => ({ resolveAuthContext: mocks.auth }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: async () => "synthetic" }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; } }));
import { POST } from "@/app/api/pos/validate-stock/route";
const request = (body: unknown) => new NextRequest("http://localhost/api/pos/validate-stock", { method: "POST", headers: { "x-business-id": "tenant" }, body: JSON.stringify(body) });
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud"); mocks.auth.mockResolvedValue({ businessId: "tenant" }); mocks.query.mockResolvedValue({ stock: { valid: true, errors: [] } }); });
it("normalizes weighted legacy fields and passes the selected request context", async () => {
  const req = request({ items: [{ inventory_id: "product", quantity: "2", weight_grams: "3.5" }] });
  expect(await (await POST(req)).json()).toEqual({ valid: true, errors: [] });
  expect(mocks.auth).toHaveBeenCalledWith(req);
  expect(mocks.query).toHaveBeenCalledWith(expect.anything(), { businessId: "tenant", items: [{ productId: "product", quantity: 3.5 }], amountCents: 0 });
});
it("preserves stock error response fields", async () => {
  mocks.query.mockResolvedValue({ stock: { valid: false, errors: [{ inventoryId: "product", message: "Insufficient stock" }] } });
  const response = await POST(request({ items: [{ productId: "product", quantity: 2 }] }));
  expect(await response.json()).toEqual({ valid: false, errors: [{ inventory_id: "product", message: "Insufficient stock" }] });
});
it.each([{ items: null }, { items: [{ productId: "product", qty: 0 }] }, { items: [{ productId: "product", weightGrams: -1, qty: 1 }] }])("rejects malformed quantities", async body => { expect((await POST(request(body))).status).toBe(400); expect(mocks.query).not.toHaveBeenCalled(); });
it("denies unauthenticated access", async () => { mocks.auth.mockResolvedValue({ businessId: null }); expect((await POST(request({ items: [] }))).status).toBe(401); });
