import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as inventory from "../../convex/inventory";
import * as generatedApi from "../../convex/_generated/api";
const modules = { "_generated/api.js": async () => generatedApi, "onboarding.ts": async () => onboarding, "products.ts": async () => products, "inventory.ts": async () => inventory };
async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "stock-owner", email: "owner@example.invalid" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { name: "Owner", businessName: "Synthetic stock", taxRateBps: 0 });
  const productId = await owner.mutation(api.products.createProduct, { sku: "STOCK", productName: "Synthetic", sellingPriceCents: 300, unitCostCents: 100, initialQuantity: 10 });
  const adjust = (key: string, value: number) => owner.mutation(api.inventory.adjustStock, { businessId, productId, idempotencyKey: key, type: "delta", value, reason: "Synthetic count correction" });
  return { t, owner, businessId, productId, adjust };
}
describe("canonical stock adjustments", () => {
  it("consumes oldest batches and replays a request without repeating stock or audit changes", async () => {
    const { t, productId, adjust } = await setup();
    await adjust("add", 2.5);
    expect((await adjust("remove", -11)).new_quantity).toBe(1.5);
    expect((await adjust("remove", -11)).replayed).toBe(true);
    await expect(adjust("remove", -1)).rejects.toThrow(/CONFLICT/);
    const batches = await t.run(ctx => ctx.db.query("inventoryBatches").withIndex("by_productId_and_receivedAt", q => q.eq("productId", productId)).collect());
    expect(batches.map(b => b.remainingQuantityGrams)).toEqual([0, 1.5]);
    const events = await t.run(ctx => ctx.db.query("auditEvents").collect());
    expect(events.filter(e => e.action === "INVENTORY_ADJUSTED")).toHaveLength(2);
  });
  it("rolls back all batch updates if stock and FIFO records disagree", async () => {
    const { t, productId, adjust } = await setup();
    await t.run(ctx => ctx.db.patch(productId, { quantityOnHandGrams: 20 }));
    await expect(adjust("mismatch", -15)).rejects.toThrow(/INVALID_STATE/);
    expect((await t.run(ctx => ctx.db.get(productId)))?.quantityOnHandGrams).toBe(20);
    expect((await t.run(ctx => ctx.db.query("inventoryBatches").first()))?.remainingQuantityGrams).toBe(10);
    expect(await t.run(ctx => ctx.db.query("idempotencyKeys").collect())).toHaveLength(0);
  });
  it("enforces tenant, role, nonnegative quantity and precision before changes", async () => {
    const { t, owner, productId, businessId, adjust } = await setup();
    await expect(adjust("negative", -11)).rejects.toThrow(/INVALID_ARGUMENT/);
    await expect(adjust("precision", 0.0000001)).rejects.toThrow(/INVALID_ARGUMENT/);
    await expect(owner.mutation(api.inventory.updateProduct, { businessId: "foreign", productId, quantity: 0 })).rejects.toThrow(/FORBIDDEN/);
    await t.run(async ctx => {
      const user = await ctx.db.query("users").first();
      await ctx.db.patch(user!._id, { role: "MEMBER" });
    });
    await expect(adjust("member", 1)).rejects.toThrow(/FORBIDDEN/);
    await expect(owner.mutation(api.inventory.updateProduct, { businessId, productId, productName: "No" })).rejects.toThrow(/FORBIDDEN/);
  });
  it("shows canonical changes in the authorized inventory audit", async () => {
    const { owner, businessId, adjust } = await setup();
    await adjust("audit-change", 2);
    const rows = await owner.query(api.inventory.recentAudit, { businessId });
    const change = rows.find(row => row.transaction_type === "INVENTORY_ADJUSTED");
    expect(change).toMatchObject({ product_name: "Synthetic", quantity_change: 2, reason: "Synthetic count correction" });
    expect(change?.created_by_email).toBeTruthy();
    await expect(owner.query(api.inventory.recentAudit, { businessId: "foreign" })).rejects.toThrow(/FORBIDDEN/);
  });

  it("updates product counts with corresponding batches and rejects duplicate SKUs", async () => {
    const { t, owner, productId, businessId } = await setup();
    await owner.mutation(api.inventory.updateProduct, { businessId, productId, productName: "Updated", quantity: 12, unitCostCents: 200 });
    expect((await t.run(ctx => ctx.db.get(productId)))?.quantityOnHandGrams).toBe(12);
    const batches = await t.run(ctx => ctx.db.query("inventoryBatches").collect());
    expect(batches.find(b => b.originalQuantityGrams === 2)?.unitCostPerGramCents).toBe(200);
    await owner.mutation(api.products.createProduct, { sku: "OTHER", productName: "Other", sellingPriceCents: 100, unitCostCents: 10 });
    await expect(owner.mutation(api.inventory.updateProduct, { businessId, productId, sku: "OTHER", quantity: 0 })).rejects.toThrow(/ALREADY_EXISTS/);
    expect((await t.run(ctx => ctx.db.get(productId)))?.quantityOnHandGrams).toBe(12);
  });
});
