import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import * as health from "../../convex/inventoryHealth";
import * as onboarding from "../../convex/onboarding";
import * as generatedApi from "../../convex/_generated/api";
const snapshot = makeFunctionReference<"query", { businessId: Id<"businesses">; expectedUserId: string }, string>("inventoryHealth:snapshot");
const productFields = { sku: "fixture", productName: "Synthetic product", unitCostCents: 101, sellingPriceCents: 150, quantityOnHandGrams: 1.25, reorderLevelGrams: 2.5, allowFractionalWeight: true, isActive: true, createdAt: 1, updatedAt: 1 };
const saleFields = { orderNumber: "fixture", orderStatus: "completed", subtotalCents: 100, taxAmountCents: 0, totalAmountCents: 100, amountPaidCents: 100, changeAmountCents: 0, paymentMethod: "cash", createdBy: "owner", createdAt: Date.now(), updatedAt: Date.now() };
const lineFields = { quantityGrams: 1, unitPriceCents: 100, lineTotalCents: 100, unitCostCents: 50, createdAt: Date.now() };
async function setup() {
  const t = convexTest(schema, { "inventoryHealth.ts": async () => health, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generatedApi });
  const owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  const productId = await t.run(ctx => ctx.db.insert("products", { ...productFields, businessId }));
  return { t, owner, businessId, productId, args: { businessId, expectedUserId: "owner" } };
}
it("uses completed occurrence-time demand, active stock and precise catalog value", async () => {
  const { t, owner, businessId, productId, args } = await setup();
  await t.run(async ctx => {
    await ctx.db.insert("products", { ...productFields, businessId, isActive: false, quantityOnHandGrams: 999 });
    for (const [orderStatus, days, quantity] of [["completed", 1, 2.5], ["completed", 40, 100], ["cancelled", 1, 100], ["refunded", 1, 100], ["pending", 1, 100]] as const) {
      const saleId = await ctx.db.insert("sales", { ...saleFields, businessId, orderStatus, occurredAt: Date.now() - days * 86400000 });
      await ctx.db.insert("salesLineItems", { ...lineFields, saleId, productId, quantityGrams: quantity });
    }
  });
  const result = JSON.parse(await owner.query(snapshot, args));
  expect(result.metrics).toEqual({ total_items: 1, low_stock_count: 1, out_of_stock_count: 0, total_inventory_value: 1.2625 });
  expect(result.low_stock_items[0]).toMatchObject({ id: productId, quantity_on_hand: 1.25, reorder_level: 2.5 });
  expect(result.reorder_predictions[0]).toMatchObject({ estimated_days_until_stockout: 15, recommended_quantity: 5 });
  expect(result.ai_insight).toBeNull();
  expect(await t.run(ctx => ctx.db.query("inventoryAnalyses").collect())).toEqual([]);
});
it("uses null stockout days for zero demand and preserves high-demand fractional recommendations", async () => {
  const { t, owner, businessId, productId, args } = await setup();
  await t.run(ctx => ctx.db.patch(productId, { quantityOnHandGrams: 0 }));
  const empty = JSON.parse(await owner.query(snapshot, args));
  expect(empty.metrics.out_of_stock_count).toBe(1);
  expect(empty.reorder_predictions[0].estimated_days_until_stockout).toBeNull();
  await t.run(async ctx => {
    await ctx.db.patch(productId, { quantityOnHandGrams: 3 });
    const saleId = await ctx.db.insert("sales", { ...saleFields, businessId });
    await ctx.db.insert("salesLineItems", { ...lineFields, saleId, productId, quantityGrams: 30.5 });
  });
  const result = JSON.parse(await owner.query(snapshot, args));
  expect(result.low_stock_items).toEqual([]);
  expect(result.reorder_predictions[0].recommended_quantity).toBe(30.5);
});
it("enforces selected tenant, expected operator, membership and inventory grants", async () => {
  const { t, owner, businessId, args } = await setup();
  const foreign = t.withIdentity({ subject: "foreign" });
  const other = await foreign.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  expect(JSON.parse(await foreign.query(snapshot, { businessId: other.businessId, expectedUserId: "foreign" })).metrics.total_items).toBe(0);
  await expect(foreign.query(snapshot, { ...args, expectedUserId: "foreign" })).rejects.toThrow(/FORBIDDEN/);
  await expect(owner.query(snapshot, { ...args, expectedUserId: "foreign" })).rejects.toThrow(/FORBIDDEN/);
  await expect(t.query(snapshot, args)).rejects.toThrow(/UNAUTHENTICATED/);
  const memberId = await t.run(ctx => ctx.db.insert("users", { businessId, clerkUserId: "staff", email: "fixture@example.invalid", role: "cashier", status: "ACTIVE", createdAt: 1, updatedAt: 1 }));
  const staff = t.withIdentity({ subject: "staff" }), staffArgs = { ...args, expectedUserId: "staff" };
  await expect(staff.query(snapshot, staffArgs)).rejects.toThrow(/FORBIDDEN/);
  await t.run(ctx => ctx.db.patch(memberId, { permissions: { "inventory.manage": true } }));
  expect(JSON.parse(await staff.query(snapshot, staffArgs)).metrics.total_items).toBe(1);
  await t.run(ctx => ctx.db.patch(memberId, { status: "SUSPENDED" }));
  await expect(staff.query(snapshot, staffArgs)).rejects.toThrow(/FORBIDDEN/);
});
it.each([{ quantityOnHandGrams: -1 }, { quantityOnHandGrams: Infinity }, { reorderLevelGrams: -1 }, { reorderLevelGrams: NaN }, { unitCostCents: 1.5 }, { unitCostCents: -1 }, { quantityOnHandGrams: Number.MAX_SAFE_INTEGER, unitCostCents: 2 }, { reorderLevelGrams: Number.MAX_SAFE_INTEGER }])("rejects invalid or overflowing values: %j", async patch => {
  const { t, owner, productId, args } = await setup();
  await t.run(ctx => ctx.db.patch(productId, patch));
  await expect(owner.query(snapshot, args)).rejects.toThrow(/INVALID_STATE/);
});
it("rejects aggregate valuation overflow", async () => {
  const { t, owner, businessId, productId, args } = await setup();
  await t.run(async ctx => {
    await ctx.db.patch(productId, { quantityOnHandGrams: 1, unitCostCents: Number.MAX_SAFE_INTEGER });
    await ctx.db.insert("products", { ...productFields, businessId });
  });
  await expect(owner.query(snapshot, args)).rejects.toThrow(/INVALID_STATE/);
});
it("rejects over 1000 active products", async () => {
  const { t, owner, businessId, args } = await setup();
  await t.run(async ctx => { for (let i = 0; i < 1000; i++) await ctx.db.insert("products", { ...productFields, businessId, sku: String(i) }); });
  await expect(owner.query(snapshot, args)).rejects.toThrow(/CAPACITY_EXCEEDED/);
});
it("applies sales-line capacity across products", async () => {
  const { t, owner, businessId, productId, args } = await setup();
  await t.run(async ctx => {
    const secondId = await ctx.db.insert("products", { ...productFields, businessId, sku: "second" });
    const saleId = await ctx.db.insert("sales", { ...saleFields, businessId });
    for (let i = 0; i < 4097; i++) await ctx.db.insert("salesLineItems", { ...lineFields, saleId, productId: i % 2 ? secondId : productId });
  });
  await expect(owner.query(snapshot, args)).rejects.toThrow(/CAPACITY_EXCEEDED/);
});
it("rejects a cross-business sale reference", async () => {
  const { t, owner, productId, args } = await setup();
  const other = await t.withIdentity({ subject: "foreign" }).mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  await t.run(async ctx => {
    const saleId = await ctx.db.insert("sales", { ...saleFields, businessId: other.businessId });
    await ctx.db.insert("salesLineItems", { ...lineFields, saleId, productId });
  });
  await expect(owner.query(snapshot, args)).rejects.toThrow(/INVALID_STATE/);
});
it("does not recommend reordering ample stock with no demand", async () => {
  const { t, owner, productId, args } = await setup();
  await t.run(ctx => ctx.db.patch(productId, { quantityOnHandGrams: 100 }));
  const result = JSON.parse(await owner.query(snapshot, args));
  expect(result.low_stock_items).toEqual([]);
  expect(result.reorder_predictions).toEqual([]);
});
