import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as inventoryChecks from "../../convex/inventoryChecks";
import * as shrinkage from "../../convex/shrinkage";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as generatedApi from "../../convex/_generated/api";
async function fixture(approval = false) {
  const t = convexTest(schema, { "inventoryChecks.ts": async () => inventoryChecks, "shrinkage.ts": async () => shrinkage, "onboarding.ts": async () => onboarding, "products.ts": async () => products, "_generated/api.js": async () => generatedApi });
  const owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Checks" });
  const productId = await owner.mutation(api.products.createProduct, { sku: "CHECK", productName: "Synthetic", sellingPriceCents: 100, unitCostCents: 10 });
  const batchId = await t.run(async ctx => {
    const settings = await ctx.db.query("businessSettings").withIndex("by_businessId", q => q.eq("businessId", businessId)).unique();
    const data = { settingsData: JSON.stringify({ require_supervisor_pin_for_shrinkage: approval, random_check_tolerance_percentage: 5 }) };
    if (settings) await ctx.db.patch(settings._id, data); else await ctx.db.insert("businessSettings", { businessId, ...data, createdAt: 1, updatedAt: 1 });
    await ctx.db.patch(productId, { quantityOnHandGrams: 10 });
    return ctx.db.insert("inventoryBatches", { businessId, productId, originalQuantityGrams: 10, remainingQuantityGrams: 10, unitCostPerGramCents: 12.5, receivedAt: 1, createdBy: "owner", createdAt: 1, updatedAt: 1 });
  });
  const args = { businessId, expectedUserId: "owner", productId, requestId: "check-a", expectedWeightGrams: 10, measuredWeightGrams: 8 };
  const state = () => t.run(async ctx => ({ product: await ctx.db.get(productId), batch: await ctx.db.get(batchId), checks: await ctx.db.query("inventoryChecks").collect(), losses: await ctx.db.query("shrinkageEvents").collect(), audits: await ctx.db.query("auditEvents").collect() }));
  return { t, owner, args, state, productId, batchId };
}
it("commits shortage, FIFO cost, check and audit once and returns the original result on retry", async () => {
  const { owner, args, state } = await fixture(); const result = await owner.mutation(api.inventoryChecks.record, args);
  expect(result).toMatchObject({ delta_grams: 2, delta_percentage: 20, discrepancy_flagged: true });
  const snapshot = await state(); expect(snapshot.product!.quantityOnHandGrams).toBe(8); expect(snapshot.batch!.remainingQuantityGrams).toBe(8);
  expect(snapshot.losses).toHaveLength(1); expect(snapshot.losses[0].costCents).toBe(25); expect(snapshot.checks).toHaveLength(1);
  expect(await owner.mutation(api.inventoryChecks.record, args)).toEqual(result); expect(await state()).toEqual(snapshot);
  await expect(owner.mutation(api.inventoryChecks.record, { ...args, measuredWeightGrams: 7 })).rejects.toThrow(/CONFLICT/);
});
it("does not silently lower stock when the discrepancy is within tolerance", async () => {
  const { owner, args, state } = await fixture();
  expect(await owner.mutation(api.inventoryChecks.record, { ...args, measuredWeightGrams: 9.5 })).toMatchObject({ discrepancy_flagged: false, delta_percentage: 5, shrinkage_id: null });
  const result = await state(); expect(result.product!.quantityOnHandGrams).toBe(10); expect(result.losses).toHaveLength(0);
});
it("rolls back the entire check when approval is required", async () => {
  const { owner, args, state } = await fixture(true); const before = await state();
  await expect(owner.mutation(api.inventoryChecks.record, args)).rejects.toThrow(/APPROVAL_REQUIRED/); expect(await state()).toEqual(before);
});
it("rejects a stale stock snapshot before recording the check", async () => {
  const { owner, args, state } = await fixture(); const before = await state();
  await expect(owner.mutation(api.inventoryChecks.record, { ...args, expectedWeightGrams: 11 })).rejects.toThrow(/STALE_STOCK/); expect(await state()).toEqual(before);
});
it("rolls back insufficient FIFO and denies outsiders", async () => {
  const { t, owner, args, state, batchId } = await fixture();
  await t.run(ctx => ctx.db.patch(batchId, { remainingQuantityGrams: 1 })); const before = await state();
  await expect(owner.mutation(api.inventoryChecks.record, args)).rejects.toThrow(/INSUFFICIENT_STOCK/);
  await expect(t.withIdentity({ subject: "outsider" }).mutation(api.inventoryChecks.record, { ...args, expectedUserId: "outsider" })).rejects.toThrow(); expect(await state()).toEqual(before);
});
it("reserves inventory-check retry IDs against direct shrinkage collisions", async () => {
  const { owner, args } = await fixture();
  await expect(owner.mutation(api.shrinkage.record, { businessId: args.businessId, expectedUserId: args.expectedUserId, productId: args.productId, requestId: "inventory-check:check-a", quantityGrams: 2, shrinkageType: "inventory_variance" })).rejects.toThrow(/Reserved/);
});
it("flags unexpected stock at zero expected balance without dividing by zero or adding stock", async () => {
  const { t, owner, args, productId, batchId, state } = await fixture();
  await t.run(async ctx => { await ctx.db.patch(productId, { quantityOnHandGrams: 0 }); await ctx.db.patch(batchId, { remainingQuantityGrams: 0 }); });
  expect(await owner.mutation(api.inventoryChecks.record, { ...args, expectedWeightGrams: 0, measuredWeightGrams: 1 })).toMatchObject({ delta_percentage: null, discrepancy_flagged: true, shrinkage_id: null });
  expect((await state()).product!.quantityOnHandGrams).toBe(0);
});
it("searches beyond the first catalog page and selects only stocked gram products", async () => {
  const { t, owner, args, productId } = await fixture();
  const eligible = await t.run(async ctx => {
    const product = (await ctx.db.get(productId))!;
    const { _id, _creationTime, ...data } = product;
    for (let i = 0; i < 200; i++) await ctx.db.insert("products", { ...data, sku: `UNIT-${i}`, sellingUnit: "unit" });
    await ctx.db.insert("products", { ...data, sku: "EMPTY", sellingUnit: "g", quantityOnHandGrams: 0 });
    return ctx.db.insert("products", { ...data, sku: "ELIGIBLE", sellingUnit: "g" });
  });
  const selected = await owner.action(api.inventoryChecks.selectRandom, { businessId: args.businessId, expectedUserId: args.expectedUserId });
  expect(selected?.inventory_id).toBe(eligible);
  await expect(t.withIdentity({ subject: "outsider" }).action(api.inventoryChecks.selectRandom, { businessId: args.businessId, expectedUserId: "outsider" })).rejects.toThrow();
});
it("reports no eligible product instead of selecting a non-gram product", async () => {
  const { owner, args } = await fixture();
  expect(await owner.action(api.inventoryChecks.selectRandom, { businessId: args.businessId, expectedUserId: args.expectedUserId })).toBeNull();
});
