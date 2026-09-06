import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getFunctionName } from "convex/server";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as generatedApi from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as checkout from "../../convex/checkout";
import * as commerceIdentity from "../../convex/commerceIdentity";
import * as deliveryProfiles from "../../convex/deliveryProfiles";
import * as reporting from "../../convex/reporting";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn(), mutation: vi.fn() }));
vi.mock("@/lib/db", () => { throw new Error("Checkout must not import Prisma"); });
vi.mock("@/lib/pos/core", () => { throw new Error("Checkout must not import the legacy writer"); });
vi.mock("@/app/api/pos/_lib/server", () => ({ resolveAuthContext: mocks.auth }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: async () => "synthetic" }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; mutation = mocks.mutation; } }));
import { POST } from "@/app/api/pos/checkout/route";
import { POST as quote } from "@/app/api/pos/quote/route";
import { POST as enhanced } from "@/app/api/pos/checkout-enhanced/route";
const modules = { "_generated/api.js": async () => generatedApi, "onboarding.ts": async () => onboarding, "products.ts": async () => products, "checkout.ts": async () => checkout, "commerceIdentity.ts": async () => commerceIdentity, "deliveryProfiles.ts": async () => deliveryProfiles, "reporting.ts": async () => reporting };
const createTest = () => convexTest(schema, modules);
let t: ReturnType<typeof createTest>;
let businessId: string;
let productId: string;
function request(body: unknown) { return new NextRequest("http://localhost/api/pos/checkout", { method: "POST", headers: { "x-business-id": businessId }, body: JSON.stringify(body) }); }
function payload(extra: Record<string, unknown> = {}) { return { mode: "full", idempotencyKey: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", items: [{ id: productId, inventoryId: productId, source: "inventory", name: "Synthetic", unitPrice: 10, qty: 1 }], payment: { method: "cash", receipt: "print" }, taxAmount: 1, ...extra }; }
beforeEach(async () => {
  vi.clearAllMocks(); vi.useFakeTimers();
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud");
  vi.stubEnv("DRX_PII_KEY_CURRENT_B64", Buffer.alloc(32, 7).toString("base64"));
  t = createTest();
  const owner = t.withIdentity({ subject: "web-full-owner", email: "owner@example.invalid" });
  ({ businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic full checkout", collectTax: true, taxRateBps: 1000 }));
  productId = await owner.mutation(api.products.createProduct, { sku: "FULL", productName: "Synthetic", sellingPriceCents: 1000, unitCostCents: 200, initialQuantity: 10 });
  mocks.auth.mockResolvedValue({ businessId, userId: "web-full-owner" });
  mocks.query.mockImplementation((name, args) => owner.query(name, args));
  mocks.mutation.mockImplementation((name, args) => owner.mutation(name, args));
});
afterEach(() => { vi.clearAllTimers(); vi.useRealTimers(); vi.unstubAllEnvs(); });
it("settles full checkout fees and payment references in the canonical ledger", async () => {
  const response = await POST(request(payload({ payment: { method: "zelle", receipt: "print" }, fees: [{ type: "Service", amount: 2 }], paymentRef: "SYNTHETIC-REF", expectedTotal: 13 })));
  expect(response.status).toBe(201);
  const result = await response.json();
  expect(result).toMatchObject({ success: true, total: 13, receipt: { receipt: "print" } });
  const sale = await t.run(ctx => ctx.db.get(ctx.db.normalizeId("sales", result.saleId)!));
  expect(sale).toMatchObject({ feeRevenueCents: 200, paymentReference: "SYNTHETIC-REF", paymentMethod: "zelle" });
});
it("quotes authorized overrides and stores their reason with the sold line", async () => {
  const body = payload({ items: [{ id: productId, inventoryId: productId, source: "inventory", name: "Synthetic", unitPrice: 8, qty: 1, originalPrice: 10, overrideReason: "Synthetic price correction" }], expectedTotal: 8.8 });
  const quoted = await quote(request(body));
  expect(await quoted.json()).toMatchObject({ success: true, quote: { total: 8.8 } });
  expect((await POST(request(body))).status).toBe(201);
  const line = await t.run(ctx => ctx.db.query("salesLineItems").first());
  expect(line).toMatchObject({ unitPriceCents: 800, priceOverrideReason: "Synthetic price correction", catalogUnitPriceCents: 1000 });
});
it("denies price overrides without the pricing permission", async () => {
  await t.run(async ctx => { const user = await ctx.db.query("users").first(); await ctx.db.patch(user!._id, { role: "cashier" }); });
  const response = await POST(request(payload({ items: [{ id: productId, inventoryId: productId, source: "inventory", name: "Synthetic", unitPrice: 8, qty: 1, overrideReason: "Synthetic" }] })));
  expect(response.status).toBe(403);
  expect(await t.run(ctx => ctx.db.query("sales").collect())).toHaveLength(0);
});
it("rejects stale displayed totals and does not trust client tax or catalog prices", async () => {
  const response = await POST(request(payload({ taxAmount: 0, expectedTotal: 10 })));
  expect(response.status).toBe(409);
  expect(await t.run(ctx => ctx.db.query("sales").collect())).toHaveLength(0);
});
it("retries an identical sale after price changes without a new quote or stock deduction", async () => {
  const body = payload({ expectedTotal: 11 });
  const first = await (await POST(request(body))).json();
  await t.run(ctx => ctx.db.patch(ctx.db.normalizeId("products", productId)!, { sellingPriceCents: 2000 }));
  const second = await (await POST(request(body))).json();
  expect(second.saleId).toBe(first.saleId);
  expect((await t.run(ctx => ctx.db.get(ctx.db.normalizeId("products", productId)!)))?.quantityOnHandGrams).toBe(9);
  expect(mocks.query.mock.calls.some(([name]) => getFunctionName(name).includes("quoteCheckout"))).toBe(false);
});
it("preserves independent delivery charges and encrypted addresses", async () => {
  const profileId = await mocks.mutation(api.deliveryProfiles.save, { name: "Synthetic courier", basePriceCents: 500, vendorFeeCents: 300, allowPriceOverride: false, isActive: true });
  const body = payload({ deliveryManagementId: profileId, deliveryAddress: "123 Synthetic Street", deliveryPrice: 5, expectedTotal: 16 });
  expect((await POST(request(body))).status).toBe(201);
  const data = await t.run(async ctx => ({ sale: await ctx.db.query("sales").first(), delivery: await ctx.db.query("deliveries").first() }));
  expect(data.sale).toMatchObject({ deliveryRevenueCents: 500, vendorDeliveryExpenseCents: 300, vendorDeliveryExpenseKnown: true });
  expect(data.delivery).toMatchObject({ profileId, customerFeeCents: 500, vendorFeeCents: 300 });
  expect(data.delivery?.addressEncrypted).not.toContain("Synthetic Street");
});
it("marks ad hoc delivery vendor costs as unknown instead of claiming complete profit", async () => {
  expect((await POST(request(payload({ deliveryAddress: "123 Synthetic Street", deliveryPrice: 0, expectedTotal: 11 })))).status).toBe(201);
  const sale = await t.run(ctx => ctx.db.query("sales").first());
  const report = await mocks.query(api.reporting.getSalesAggregate, { startAt: sale!.createdAt, endAt: sale!.createdAt + 1, timezone: "UTC" });
  expect(report.grossProfitComplete).toBe(false);
  expect(report.unknownVendorExpenseOrderCount).toBe(1);
});
it("enforces delivery profile charges and tenant ownership", async () => {
  const profileId = await mocks.mutation(api.deliveryProfiles.save, { name: "Courier", basePriceCents: 500, vendorFeeCents: 300, allowPriceOverride: false, isActive: true });
  expect((await POST(request(payload({ deliveryManagementId: profileId, deliveryAddress: "123 Synthetic Street", deliveryPrice: 2 })))).status).toBe(409);
  const other = t.withIdentity({ subject: "other-owner", email: "other@example.invalid" });
  const otherBusiness = await other.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other", collectTax: false });
  await t.run(ctx => ctx.db.patch(profileId, { businessId: otherBusiness.businessId }));
  expect((await POST(request(payload({ deliveryManagementId: profileId, deliveryAddress: "123 Synthetic Street", deliveryPrice: 5 })))).status).toBe(400);
});
it("keeps checkout-enhanced on the same transaction and requires a stable request key", async () => {
  const body = { idempotencyKey: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb", lineItems: [{ inventory_id: productId, product_name: "Synthetic", quantity: 1, unit_price: 10 }], taxAmount: 1, paymentMethod: "cash" };
  expect((await enhanced(request(body))).status).toBe(200);
  expect((await enhanced(request({ ...body, idempotencyKey: undefined }))).status).toBe(400);
});
it("retains ordinary Quick POS checkout without importing the legacy writer", async () => { expect((await POST(request(payload({ mode: "quick" })))).status).toBe(201); });
it("returns sanitized failures and rejects missing auth", async () => {
  mocks.mutation.mockRejectedValue(new Error("private provider payload"));
  const response = await POST(request(payload())); expect(response.status).toBe(503); expect(await response.text()).not.toContain("private provider");
  mocks.auth.mockResolvedValue({ businessId: null, userId: null }); expect((await POST(request(payload()))).status).toBe(401);
});
