import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { getFunctionName } from "convex/server";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import type { Id } from "../../convex/_generated/dataModel";
import { api } from "../../convex/_generated/api";
import * as generatedApi from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as customers from "../../convex/customers";
import * as checkout from "../../convex/checkout";
import * as posBootstrap from "../../convex/posBootstrap";
const mocks = vi.hoisted(() => ({ auth: vi.fn(), query: vi.fn(), token: vi.fn() }));
vi.mock("@/lib/db", () => { throw new Error("POS bootstrap must not load Prisma"); });
vi.mock("@/app/api/pos/_lib/server", () => ({ resolveAuthContext: mocks.auth }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; } }));
import { GET } from "@/app/api/pos/bootstrap/route";
const modules = { "_generated/api.js": async () => generatedApi, "onboarding.ts": async () => onboarding, "products.ts": async () => products, "customers.ts": async () => customers, "checkout.ts": async () => checkout, "posBootstrap.ts": async () => posBootstrap };
const createTest = () => convexTest(schema, modules);
let t: ReturnType<typeof createTest>;
let businessId: string;
let productId: Id<"products">;
let recentId: Id<"products">;
beforeEach(async () => {
  vi.clearAllMocks(); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud");
  t = createTest();
  const owner = t.withIdentity({ subject: "bootstrap-owner", email: "owner@example.invalid" });
  ({ businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic register", collectTax: false }));
  productId = await owner.mutation(api.products.createProduct, { sku: "SOLD", productName: "Sold out favorite", sellingPriceCents: 1200, unitCostCents: 100, initialQuantity: 4, allowFractionalWeight: false });
  recentId = await owner.mutation(api.products.createProduct, { sku: "RECENT", productName: "Recent item", sellingPriceCents: 500, unitCostCents: 100, initialQuantity: 10, allowFractionalWeight: true });
  await owner.mutation(api.checkout.processCheckout, { orderNumber: "BOOTSTRAP-1", items: [{ productId: productId, quantityGrams: 4 }], paymentMethod: "cash", amountPaidCents: 4800 });
  await owner.mutation(api.checkout.processCheckout, { orderNumber: "BOOTSTRAP-2", items: [{ productId: recentId, quantityGrams: 0.5 }], paymentMethod: "cash", amountPaidCents: 250 });
  mocks.auth.mockResolvedValue({ businessId, userId: "bootstrap-owner" }); mocks.token.mockResolvedValue("synthetic-token");
  mocks.query.mockImplementation((name, args) => owner.query(name, args));
});
afterEach(() => { vi.unstubAllEnvs(); });
it("preserves sold-out favorites, canonical quantity and complete pricing rules", async () => {
  const request = new NextRequest("http://localhost/api/pos/bootstrap", { headers: { "x-business-id": businessId } });
  const response = await GET(request); const data = await response.json();
  expect(response.status).toBe(200); expect(mocks.auth).toHaveBeenCalledWith(request);
  expect(data.favorites[0]).toMatchObject({ id: productId, quantity_on_hand: 0, price: 12, commerce_config: { fractionalEnabled: false } });
  expect(data.favorites[0]).not.toHaveProperty("fractional_config");
  expect(data.recentlySold[0]).toMatchObject({ id: recentId, quantity_on_hand: 9.5, fractional_config: { fractionalEnabled: true } });
  expect(data.data.favorites).toEqual(data.favorites);
  expect(response.headers.get("cache-control")).toContain("no-store");
});
it("uses the current whole-unit bulk rules instead of an old settings blob", async () => {
  await t.run(ctx => ctx.db.patch(ctx.db.normalizeId("products", productId)!, { sellingUnit: "case", quantityPrecision: 0, minimumSaleQuantity: 1, quantityIncrement: 1, suggestedQuantityPresets: [1, 12], suggestedDollarPresetsCents: [5000], bulkPriceTiers: [{ minimumQuantity: 12, unitPriceCents: 800 }] }));
  const data = await (await GET()).json();
  expect(data.favorites[0]).toMatchObject({ commerce_config: { sellingUnit: "case", suggestedDollarAmounts: [50], bulkPriceTiers: [expect.objectContaining({ minimumQuantity: 12, unitPrice: 8 })] } });
});
it("aggregates the full paginated history and ignores canceled sales", async () => {
  await t.run(async ctx => {
    for (let index = 0; index < 30; index++) {
      const saleId = await ctx.db.insert("sales", { businessId: ctx.db.normalizeId("businesses", businessId)!, orderNumber: `HISTORY-${index}`, orderStatus: index === 0 ? "canceled" : "completed", subtotalCents: 500, taxAmountCents: 0, totalAmountCents: 500, amountPaidCents: 500, changeAmountCents: 0, paymentMethod: "cash", createdBy: "bootstrap-owner", createdAt: index + 1, updatedAt: index + 1 });
      await ctx.db.insert("salesLineItems", { saleId, productId: ctx.db.normalizeId("products", recentId)!, quantityGrams: 1, unitPriceCents: 500, lineTotalCents: 500, unitCostCents: 100, createdAt: index + 1 });
    }
  });
  const data = await (await GET()).json();
  expect(data.favorites[0].id).toBe(recentId);
  expect(mocks.query.mock.calls.filter(([name]) => getFunctionName(name) === "posBootstrap:salesPage").length).toBeGreaterThan(1);
  const owner = t.withIdentity({ subject: "bootstrap-owner" });
  const first = await owner.query(api.posBootstrap.salesPage, { businessId, through: 1, paginationOpts: { cursor: null, numItems: 25 } });
  expect(first.groups).toEqual([]);
});
it("removes inactive products without exposing a foreign catalog record", async () => {
  await t.run(ctx => ctx.db.patch(ctx.db.normalizeId("products", productId)!, { isActive: false }));
  const data = await (await GET()).json(); expect(data.favorites.map((item: { id: string }) => item.id)).not.toContain(productId);
  const other = t.withIdentity({ subject: "other", email: "other@example.invalid" });
  const otherBusiness = await other.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  expect(await other.query(api.posBootstrap.catalog, { businessId: otherBusiness.businessId, productIds: [recentId] })).toEqual([]);
  await expect(other.query(api.posBootstrap.salesPage, { businessId, through: Date.now(), paginationOpts: { cursor: null, numItems: 25 } })).rejects.toThrow(/FORBIDDEN/);
});
it("reads credit and delivery policies from canonical records", async () => {
  const owner = t.withIdentity({ subject: "bootstrap-owner" });
  await owner.mutation(api.customers.createCustomer, { firstName: "Synthetic", creditLimitCents: 0 });
  await t.run(ctx => ctx.db.insert("businessSettings", { businessId: ctx.db.normalizeId("businesses", businessId)!, deliveryFeeTaxable: true, deliveryDispatchSlaMinutes: 9, createdAt: Date.now(), updatedAt: Date.now() }));
  const data = await (await GET()).json(); expect(data.creditPolicy.enabled).toBe(true); expect(data.deliveryPolicy).toEqual({ feeTaxable: true, dispatchSlaMinutes: 9 });
});
it("fails closed without returning partial bootstrap data after a provider failure", async () => {
  const original = mocks.query.getMockImplementation()!;
  mocks.query.mockImplementation((name, args) => getFunctionName(name) === "posBootstrap:catalog" ? Promise.reject(new Error("private provider payload")) : original(name, args));
  const response = await GET(); expect(response.status).toBe(503);
  const data = await response.json(); expect(data).not.toHaveProperty("favorites"); expect(JSON.stringify(data)).not.toContain("private provider");
});
it("rejects anonymous requests", async () => { mocks.token.mockResolvedValue(null); expect((await GET()).status).toBe(401); expect(mocks.query).not.toHaveBeenCalled(); });

it("paginates every line of a large historical order", async () => {
  await t.run(async ctx => {
    const saleId = await ctx.db.insert("sales", { businessId: ctx.db.normalizeId("businesses", businessId)!, orderNumber: "LARGE-HISTORY", orderStatus: "completed", subtotalCents: 110000, taxAmountCents: 0, totalAmountCents: 110000, amountPaidCents: 110000, changeAmountCents: 0, paymentMethod: "cash", createdBy: "bootstrap-owner", createdAt: 1, updatedAt: 1 });
    for (let index = 0; index < 220; index++) await ctx.db.insert("salesLineItems", { saleId, productId: recentId, quantityGrams: 1, unitPriceCents: 500, lineTotalCents: 500, unitCostCents: 100, createdAt: 1 });
  });
  const response = await GET(); expect(response.status).toBe(200);
  expect((await response.json()).favorites[0].id).toBe(recentId);
  expect(mocks.query.mock.calls.filter(([name]) => getFunctionName(name) === "posBootstrap:saleLinesPage")).toHaveLength(2);
});
it("denies register data to a member without checkout permission", async () => {
  await t.run(async ctx => { const user = await ctx.db.query("users").first(); await ctx.db.patch(user!._id, { role: "viewer" }); });
  expect((await GET()).status).toBe(403);
});

it("returns a valid bootstrap response when auth bypass is enabled", async () => {
  vi.stubEnv("BYPASS_AUTH_FOR_TESTING", "true");
  vi.stubEnv("BYPASS_AUTH_USER_ID", "bypass_user");
  vi.stubEnv("BYPASS_AUTH_ORG_ID", businessId);
  const response = await GET();
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data).toHaveProperty("favorites");
  expect(data).toHaveProperty("creditPolicy");
  expect(data).toHaveProperty("deliveryPolicy");
});

it("returns a preview fallback when query fails in preview without Clerk", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("CLERK_SECRET_KEY", "");
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "");
  mocks.query.mockRejectedValue(new Error("UNAUTHORIZED: Auth required"));
  const response = await GET();
  expect(response.status).toBe(200);
  const data = await response.json();
  expect(data.creditPolicy).toEqual({ enabled: false });
  expect(data.deliveryPolicy).toEqual({ feeTaxable: false, dispatchSlaMinutes: 5 });
});

it("propagates error when Clerk is configured in preview", async () => {
  vi.stubEnv("VERCEL_ENV", "preview");
  vi.stubEnv("CLERK_SECRET_KEY", "sk_test_123");
  vi.stubEnv("NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY", "pk_test_123");
  mocks.query.mockRejectedValue(new Error("Convex query failed"));
  const response = await GET();
  expect(response.status).toBe(503);
});
