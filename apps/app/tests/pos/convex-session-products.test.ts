import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ token: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/db", () => { throw new Error("Session and product reads must not load Prisma"); });
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; } }));
import { resolveAuthContext, assertBusinessAccess } from "@/app/api/pos/_lib/server";
import { GET } from "@/app/api/pos/products/route";
beforeEach(() => {
  vi.resetAllMocks(); process.env.NEXT_PUBLIC_CONVEX_URL = "https://synthetic.convex.cloud";
  mocks.token.mockResolvedValue("synthetic-token");
});
it("resolves membership from Convex and never grants access for a different actor", async () => {
  mocks.query.mockResolvedValue({ userId: "owner", businessId: "canonical-business", role: "OWNER" });
  expect(await resolveAuthContext("mapped-business")).toEqual({ userId: "owner", businessId: "canonical-business" });
  expect(await assertBusinessAccess("another-user", "canonical-business")).toBe(false);
  mocks.query.mockRejectedValue(new Error("FORBIDDEN: membership mismatch"));
  expect(await resolveAuthContext("foreign")).toEqual({ userId: null, businessId: null });
});
it("uses fresh canonical stock and price for POS lookup", async () => {
  mocks.query.mockResolvedValueOnce({ userId: "owner", businessId: "business", role: "OWNER" }).mockResolvedValueOnce({
    page: [{ _id: "product", sku: "SKU", productName: "Synthetic", quantityOnHandGrams: 7.25, sellingPriceCents: 425,
      reorderLevelGrams: 1, allowFractionalWeight: true, sellingUnit: "g", quantityPrecision: 2, minimumSaleQuantity: 0.01,
      quantityIncrement: 0.01, suggestedDollarPresetsCents: [500], suggestedQuantityPresets: [1], bulkPriceTiers: [] }],
    isDone: true, continueCursor: "end",
  });
  const response = await GET(new NextRequest("https://example.test/api/pos/products?search=SKU&exact=1"));
  expect(response.status).toBe(200);
  expect((await response.json()).items).toEqual([expect.objectContaining({ id: "product", quantity_on_hand: 7.25, price: 4.25 })]);
});
it("finds a separately entered barcode at checkout", async () => {
  mocks.query.mockResolvedValueOnce({ userId: "owner", businessId: "business", role: "OWNER" }).mockResolvedValueOnce({
    page: [{ _id: "product", sku: "DRX-123", barcode: "012345678905", productName: "Synthetic",
      quantityOnHandGrams: 7, sellingPriceCents: 3500, reorderLevelGrams: 1,
      allowFractionalWeight: true, sellingUnit: "g", quantityPrecision: 1,
      minimumSaleQuantity: 0.5, quantityIncrement: 0.5,
      suggestedDollarPresetsCents: [], suggestedQuantityPresets: [0.5, 1], bulkPriceTiers: [] }],
    isDone: true, continueCursor: "end",
  });
  const response = await GET(new NextRequest("https://example.test/api/pos/products?search=012345678905&exact=1"));
  expect(response.status).toBe(200);
  expect((await response.json()).items).toEqual([expect.objectContaining({ id: "product", barcode: "012345678905" })]);
});
it("does not query business data without a signed-in token", async () => {
  mocks.token.mockResolvedValue(null);
  expect(await resolveAuthContext()).toEqual({ userId: null, businessId: null });
  expect(mocks.query).not.toHaveBeenCalled();
});
