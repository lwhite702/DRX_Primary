import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as customers from "../../convex/customers";
import * as commerceIdentity from "../../convex/commerceIdentity";
import * as generatedApi from "../../convex/_generated/api";
const mocks = vi.hoisted(() => ({ query: vi.fn(), auth: vi.fn(), token: vi.fn() }));
vi.mock("@/lib/db", () => { throw new Error("Preflight must not load Prisma"); });
vi.mock("@/lib/pos/core", () => { throw new Error("Preflight must not load the legacy checkout core"); });
vi.mock("@/app/api/pos/_lib/server", () => ({ resolveAuthContext: mocks.auth }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; } }));
import { POST } from "@/app/api/pos/preflight/route";
const modules = { "_generated/api.js": async () => generatedApi, "onboarding.ts": async () => onboarding, "products.ts": async () => products, "customers.ts": async () => customers, "commerceIdentity.ts": async () => commerceIdentity };
const createTest = () => convexTest(schema, modules);
let t: ReturnType<typeof createTest>;
let businessId: string;
let productId: string;
let customerId: string;
function request(body: unknown) { return new NextRequest("http://localhost/api/pos/preflight", { method: "POST", body: JSON.stringify(body) }); }
beforeEach(async () => {
  vi.clearAllMocks();
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud");
  t = createTest();
  const owner = t.withIdentity({ subject: "preflight-owner", email: "owner@example.invalid" });
  ({ businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { name: "Owner", businessName: "Synthetic preflight", taxRateBps: 0 }));
  productId = await owner.mutation(api.products.createProduct, { sku: "TEST", productName: "Synthetic item", sellingPriceCents: 100, unitCostCents: 10, initialQuantity: 5, allowFractionalWeight: false });
  customerId = await owner.mutation(api.customers.createCustomer, { firstName: "Synthetic", creditLimitCents: 10000 });
  await t.run(async ctx => {
    const id = ctx.db.normalizeId("products", productId)!;
    await ctx.db.patch(id, { legacyPrismaId: "legacy-product" });
    await ctx.db.patch(ctx.db.normalizeId("customers", customerId)!, { totalCreditUsedCents: 9000 });
  });
  mocks.auth.mockResolvedValue({ businessId, userId: "preflight-owner" });
  mocks.token.mockResolvedValue("synthetic-token");
  mocks.query.mockImplementation((name, args) => owner.query(name, args));
});
it("checks canonical stock and credit in one authenticated snapshot", async () => {
  const response = await POST(request({ items: [{ inventory_id: productId, quantity: "2", unit_price: "1" }], customer_id: customerId, amount: 5 }));
  expect(response.status).toBe(200);
  expect(await response.json()).toMatchObject({ valid: true, stock: { valid: true }, credit: { currentBalance: 90, maxLimit: 100, remaining: 10, unlimited: false }, pricing: { valid: true } });
  expect(mocks.query).toHaveBeenCalledTimes(1);
});
it("aggregates canonical and migrated aliases before checking availability", async () => {
  const response = await POST(request({ items: [{ inventoryId: productId, qty: 3 }, { inventory_id: "legacy-product", qty: 3 }] }));
  expect(await response.json()).toMatchObject({ valid: false, stock: { valid: false, errors: [{ inventoryId: productId, message: expect.stringContaining("combined") }] } });
});
it("rejects fractional counts and over-limit credit", async () => {
  const response = await POST(request({ items: [{ productId, quantity: 0.5 }], customerId, amount: 10.01 }));
  expect(await response.json()).toMatchObject({ valid: false, stock: { valid: false }, credit: { valid: false, warning: "Credit limit exceeded" } });
});
it("keeps Convex's zero-limit convention explicit without a fake finite balance", async () => {
  await t.run(ctx => ctx.db.patch(ctx.db.normalizeId("customers", customerId)!, { creditLimitCents: 0 }));
  const response = await POST(request({ items: [], customerId, amount: 1000 }));
  expect(await response.json()).toMatchObject({ credit: { valid: true, remaining: null, unlimited: true } });
});
it("does not expose a foreign customer's balance or product metadata", async () => {
  const other = t.withIdentity({ subject: "other", email: "other@example.invalid" });
  const otherBusiness = await other.mutation(api.onboarding.createBusinessOnboarding, { name: "Other", businessName: "Other", taxRateBps: 0 });
  mocks.auth.mockResolvedValue({ businessId: otherBusiness.businessId, userId: "other" });
  mocks.query.mockImplementation((name, args) => other.query(name, args));
  const stock = await POST(request({ items: [{ productId, quantity: 1 }] }));
  expect(await stock.json()).toMatchObject({ valid: false, stock: { errors: [{ message: "Inventory item is unavailable" }] } });
  const credit = await POST(request({ items: [], customerId, amount: 1 }));
  expect(credit.status).toBe(404);
  expect(await credit.json()).toEqual({ error: "The selected customer is unavailable" });
});
it.each([-1, "NaN", 0.001])("rejects invalid monetary input %s", async amount => {
  expect((await POST(request({ items: [], amount }))).status).toBe(400);
  expect(mocks.query).not.toHaveBeenCalled();
});
it("rejects missing product IDs instead of silently skipping stock checks", async () => {
  expect((await POST(request({ items: [{ quantity: 1 }] }))).status).toBe(400);
});
it("rejects a selected business outside the authenticated membership", async () => {
  mocks.auth.mockResolvedValue({ businessId: "foreign-business", userId: "preflight-owner" });
  expect((await POST(request({ items: [] }))).status).toBe(403);
});
it("rejects a revoked checkout permission", async () => {
  await t.run(async ctx => { const user = await ctx.db.query("users").first(); await ctx.db.patch(user!._id, { role: "viewer" }); });
  expect((await POST(request({ items: [] }))).status).toBe(403);
});
it("retains pricing-shape failures for manual lines and does not reserve stock", async () => {
  const response = await POST(request({ items: [{ source: "manual", qty: 1, unitPrice: -1 }] }));
  expect(await response.json()).toMatchObject({ valid: false, stock: { valid: true }, pricing: { valid: false, errors: ["Invalid unit price"] } });
});
it("sanitizes provider failures and denies unauthenticated checks", async () => {
  mocks.query.mockRejectedValue(new Error("private provider payload"));
  const response = await POST(request({ items: [] }));
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain("private provider");
  mocks.auth.mockResolvedValue({ businessId: null });
  expect((await POST(request({ items: [] }))).status).toBe(401);
});
