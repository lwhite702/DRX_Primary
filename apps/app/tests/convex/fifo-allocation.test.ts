import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import { makeFunctionReference } from "convex/server";
import { v } from "convex/values";
import { mutation } from "../../convex/_generated/server";
import { allocateFifoInventoryBatches } from "../../convex/helpers/fifo";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as generatedApi from "../../convex/_generated/api";
const allocate = mutation({ args: { businessId: v.id("businesses"), productId: v.id("products"), quantity: v.number() }, handler: (ctx, args) => allocateFifoInventoryBatches(ctx, args.businessId, args.productId, args.quantity) });
const ref = makeFunctionReference<"mutation">("fixture:allocate");
async function fixture() {
  const t = convexTest(schema, { "fixture.ts": async () => ({ allocate }), "onboarding.ts": async () => onboarding, "products.ts": async () => products, "_generated/api.js": async () => generatedApi });
  const owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "FIFO" });
  const productId = await owner.mutation(api.products.createProduct, { sku: "FIFO", productName: "Synthetic", sellingPriceCents: 100, unitCostCents: 10 });
  const batch = async (quantity: number, cost: number, receivedAt: number, tenant = businessId) => t.run(ctx => ctx.db.insert("inventoryBatches", { businessId: tenant, productId, originalQuantityGrams: quantity, remainingQuantityGrams: quantity, unitCostPerGramCents: cost, receivedAt, createdBy: "owner", createdAt: 1, updatedAt: 1 }));
  return { t, businessId, productId, batch };
}
it("preserves fractional unit costs and allocates in FIFO order", async () => {
  const { t, businessId, productId, batch } = await fixture();
  const first = await batch(0.1, 12.5, 1), second = await batch(0.2, 25, 2);
  const result = await t.mutation(ref, { businessId, productId, quantity: 0.3 });
  expect(result).toEqual([expect.objectContaining({ batchId: first, allocatedGrams: 0.1, unitCostPerGramCents: 12.5, extendedCostCents: 1 }), expect.objectContaining({ batchId: second, extendedCostCents: 5 })]);
});
it("rolls back stock when active batches are insufficient", async () => {
  const { t, businessId, productId, batch } = await fixture(); const id = await batch(1, 10, 1);
  await expect(t.mutation(ref, { businessId, productId, quantity: 2 })).rejects.toThrow(/INSUFFICIENT_STOCK/);
  expect((await t.run(ctx => ctx.db.get(id)))!.remainingQuantityGrams).toBe(1);
});
it("rejects malformed ownership instead of skipping it and consuming later stock", async () => {
  const { t, businessId, productId, batch } = await fixture();
  const foreign = await t.withIdentity({ subject: "foreign" }).mutation(api.onboarding.createBusinessOnboarding, { businessName: "Foreign" });
  await batch(1, 10, 1, foreign.businessId); const own = await batch(1, 10, 2);
  await expect(t.mutation(ref, { businessId, productId, quantity: 1 })).rejects.toThrow(/INVALID_STATE/);
  expect((await t.run(ctx => ctx.db.get(own)))!.remainingQuantityGrams).toBe(1);
});
it("rejects non-finite allocation quantities", async () => {
  const { t, businessId, productId } = await fixture();
  await expect(t.mutation(ref, { businessId, productId, quantity: Infinity })).rejects.toThrow(/INVALID_ARGUMENT/);
});

it("fails atomically when one allocation needs more than the active batch bound", async () => {
  const { t, businessId, productId } = await fixture();
  const first = await t.run(async ctx => {
    let firstId;
    for (let i = 0; i < 4097; i++) {
      const id = await ctx.db.insert("inventoryBatches", { businessId, productId, originalQuantityGrams: 1, remainingQuantityGrams: 1, unitCostPerGramCents: 1, receivedAt: i, createdBy: "owner", createdAt: i, updatedAt: i });
      firstId ??= id;
    }
    return firstId!;
  });
  await expect(t.mutation(ref, { businessId, productId, quantity: 4097 })).rejects.toThrow(/transaction bound/);
  expect((await t.run(ctx => ctx.db.get(first)))!.remainingQuantityGrams).toBe(1);
  expect(await t.mutation(ref, { businessId, productId, quantity: 1 })).toHaveLength(1);
});
