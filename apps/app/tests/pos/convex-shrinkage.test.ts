import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as shrinkage from "../../convex/shrinkage";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as generatedApi from "../../convex/_generated/api";
async function fixture(policy: unknown = false) {
  const t = convexTest(schema, { "shrinkage.ts": async () => shrinkage, "onboarding.ts": async () => onboarding, "products.ts": async () => products, "_generated/api.js": async () => generatedApi });
  const owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic shrinkage" });
  const productId = await owner.mutation(api.products.createProduct, { sku: "SHRINK", productName: "Synthetic", sellingPriceCents: 100, unitCostCents: 10 });
  const batchId = await t.run(async ctx => {
    const settings = await ctx.db.query("businessSettings").withIndex("by_businessId", q => q.eq("businessId", businessId)).unique();
    const settingsData = JSON.stringify({ require_supervisor_pin_for_shrinkage: policy });
    if (settings) await ctx.db.patch(settings._id, { settingsData });
    else await ctx.db.insert("businessSettings", { businessId, settingsData, createdAt: 1, updatedAt: 1 });
    await ctx.db.patch(productId, { quantityOnHandGrams: 2 });
    return ctx.db.insert("inventoryBatches", { businessId, productId, originalQuantityGrams: 2, remainingQuantityGrams: 2, unitCostPerGramCents: 12.5, receivedAt: 1, createdBy: "owner", createdAt: 1, updatedAt: 1 });
  });
  const args = { businessId, expectedUserId: "owner", productId, requestId: "synthetic-request", quantityGrams: 0.4, shrinkageType: "damaged" as const, note: "Synthetic private note" };
  const state = () => t.run(async ctx => ({ product: await ctx.db.get(productId) as any, batch: await ctx.db.get(batchId), events: await ctx.db.query("shrinkageEvents").collect(), audits: await ctx.db.query("auditEvents").filter(q => q.eq(q.field("action"), "SHRINKAGE_RECORDED")).collect() }));
  return { t, owner, businessId, productId, batchId, args, state };
}
it("commits stock, FIFO costs and a private audit atomically; identical retry returns the original receipt", async () => {
  const { owner, args, state } = await fixture();
  const receipt = await owner.mutation(api.shrinkage.record, args);
  expect(receipt).toMatchObject({ new_inventory_grams: 1.6, costCents: 5, replayed: false });
  const first = await state();
  expect(first.product!.quantityOnHandGrams).toBe(1.6);
  expect(first.batch!.remainingQuantityGrams).toBe(1.6);
  expect(first.events).toHaveLength(1); expect(first.audits).toHaveLength(1);
  expect(first.events[0].allocations[0]).toMatchObject({ allocatedGrams: 0.4, unitCostPerGramCents: 12.5, extendedCostCents: 5 });
  expect(first.audits[0].metadata).not.toContain(args.note);
  expect(await owner.mutation(api.shrinkage.record, args)).toEqual({ ...receipt, replayed: true });
  expect(await state()).toEqual(first);
  await expect(owner.mutation(api.shrinkage.record, { ...args, quantityGrams: 0.5 })).rejects.toThrow(/CONFLICT/);
  expect(await state()).toEqual(first);
});
it("rolls back every write when FIFO stock disagrees with product stock", async () => {
  const { t, owner, args, batchId, state } = await fixture();
  await t.run(ctx => ctx.db.patch(batchId, { remainingQuantityGrams: 0.1 }));
  const before = await state();
  await expect(owner.mutation(api.shrinkage.record, args)).rejects.toThrow(/INSUFFICIENT_STOCK/);
  expect(await state()).toEqual(before);
});
it.each([true, null, "false"])("fails closed for unresolved or approval-required policy %s", async policy => {
  const { owner, args, state } = await fixture(policy); const before = await state();
  await expect(owner.mutation(api.shrinkage.record, args)).rejects.toThrow(/APPROVAL_REQUIRED|INVALID_STATE/);
  expect(await state()).toEqual(before);
});
it.each([0.0000000000001, 0.1234567, 3, Infinity, -1])("rejects invalid or excessive quantity %s without writing", async quantityGrams => {
  const { owner, args, state } = await fixture(); const before = await state();
  await expect(owner.mutation(api.shrinkage.record, { ...args, quantityGrams })).rejects.toThrow(/INVALID_ARGUMENT|INSUFFICIENT_STOCK/);
  expect(await state()).toEqual(before);
});
it("denies foreign and restricted users without exposing or changing stock", async () => {
  const { t, owner, businessId, args, state } = await fixture();
  await t.run(ctx => ctx.db.insert("users", { businessId, clerkUserId: "restricted", email: "restricted@example.invalid", role: "unassigned", status: "ACTIVE", createdAt: 1, updatedAt: 1 }));
  const before = await state();
  for (const subject of ["outsider", "restricted"]) await expect(t.withIdentity({ subject }).mutation(api.shrinkage.record, { ...args, expectedUserId: subject })).rejects.toThrow();
  const foreign = await t.withIdentity({ subject: "foreign" }).mutation(api.onboarding.createBusinessOnboarding, { businessName: "Foreign" });
  await expect(owner.mutation(api.shrinkage.record, { ...args, businessId: foreign.businessId })).rejects.toThrow();
  expect(await state()).toEqual(before);
});
it.each(["store_use", "sample", "other", "damage", "spillage"] as const)("preserves the existing reason %s in the canonical event", async shrinkageType => {
  const { owner, args, state } = await fixture();
  await owner.mutation(api.shrinkage.record, { ...args, shrinkageType });
  expect((await state()).events[0].shrinkageType).toBe(shrinkageType);
});
