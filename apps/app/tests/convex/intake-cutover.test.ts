import { describe, expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as products from "../../convex/products";
import * as intake from "../../convex/intake";
import * as generatedApi from "../../convex/_generated/api";

const modules = { "_generated/api.js": async () => generatedApi, "onboarding.ts": async () => onboarding,
  "products.ts": async () => products, "intake.ts": async () => intake };
async function setup() {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "intake-owner", email: "owner@example.invalid" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { name: "Owner", businessName: "Synthetic intake", taxRateBps: 0 });
  const productId = await owner.mutation(api.products.createProduct, { sku: "INTAKE-TEST", productName: "Synthetic product", sellingPriceCents: 300, unitCostCents: 100, reorderLevelGrams: 1 });
  const submit = (idempotencyKey: string, totalCostCents = 1000) => owner.mutation(api.intake.submitIntake, { businessId, productId, idempotencyKey, totalCostCents, totalWeightGrams: 10 });
  return { t, owner, businessId, productId, submit };
}

describe("canonical web intake cutover", () => {
  it("records stock, FIFO batch and audit once, and detects changed replay payloads", async () => {
    const { t, submit, productId } = await setup();
    const first = await submit("request-one");
    expect(first.requiresApproval).toBe(false);
    expect((await submit("request-one")).replayed).toBe(true);
    await expect(submit("request-one", 1100)).rejects.toThrow(/CONFLICT/);
    await t.run(async ctx => {
      expect((await ctx.db.get(productId))?.quantityOnHandGrams).toBe(10);
      expect(await ctx.db.query("inventoryIntakes").collect()).toHaveLength(1);
      expect(await ctx.db.query("inventoryBatches").collect()).toHaveLength(1);
      const events = await ctx.db.query("auditEvents").collect();
      expect(events.filter(e => e.action === "INVENTORY_INTAKE_RECORDED")).toHaveLength(1);
    });
  });

  it("holds unusual cost for approval and applies an approval only once", async () => {
    const { t, owner, submit, productId, businessId } = await setup();
    await submit("baseline");
    const pending = await submit("unusual", 2000);
    expect(pending.requiresApproval).toBe(true);
    expect((await t.run(ctx => ctx.db.get(productId)))?.quantityOnHandGrams).toBe(10);
    const args = { businessId, intakeId: pending.intakeId, action: "approve" as const };
    await owner.mutation(api.intake.decideIntake, args);
    await owner.mutation(api.intake.decideIntake, args);
    expect((await t.run(ctx => ctx.db.get(productId)))?.quantityOnHandGrams).toBe(20);
    expect(await t.run(ctx => ctx.db.query("inventoryBatches").collect())).toHaveLength(2);
    await expect(owner.mutation(api.intake.decideIntake, { ...args, action: "reject" })).rejects.toThrow(/CONFLICT/);
  });

  it("rejects invalid money, anonymous and foreign tenant operations without stock writes", async () => {
    const { t, owner, productId, businessId } = await setup();
    const args = { businessId, productId, idempotencyKey: "bad", totalCostCents: 1000, totalWeightGrams: 10 };
    await expect(t.mutation(api.intake.submitIntake, args)).rejects.toThrow(/UNAUTHENTICATED/);
    for (const totalCostCents of [-1, 0, 1.5, Number.MAX_SAFE_INTEGER + 1]) {
      await expect(owner.mutation(api.intake.submitIntake, { ...args, totalCostCents })).rejects.toThrow(/INVALID_ARGUMENT/);
    }
    await expect(owner.mutation(api.intake.submitIntake, { ...args, businessId: "other-business" })).rejects.toThrow(/FORBIDDEN/);
    expect((await t.run(ctx => ctx.db.get(productId)))?.quantityOnHandGrams).toBe(0);
    expect(await t.run(ctx => ctx.db.query("inventoryIntakes").collect())).toHaveLength(0);
  });

  it("uses the same catalog stock after intake and rejects foreign catalog access", async () => {
    const { owner, submit, businessId, productId, t } = await setup();
    await submit("catalog-stock");
    const page = await owner.query(api.products.listCatalogPage, { businessId, paginationOpts: { numItems: 1, cursor: null } });
    expect(page.page[0]._id).toBe(productId);
    expect(page.page[0].quantityOnHandGrams).toBe(10);
    await expect(owner.query(api.products.listCatalogPage, { businessId: "foreign", paginationOpts: { numItems: 1, cursor: null } })).rejects.toThrow(/FORBIDDEN/);
    await expect(t.query(api.products.getCatalogProduct, { businessId, productId })).rejects.toThrow(/UNAUTHENTICATED/);
    const other = t.withIdentity({ subject: "other-owner", email: "other@example.invalid" });
    const otherBusiness = await other.mutation(api.onboarding.createBusinessOnboarding, { name: "Other", businessName: "Other synthetic", taxRateBps: 0 });
    await expect(other.query(api.products.getCatalogProduct, { businessId: otherBusiness.businessId, productId })).rejects.toThrow(/NOT_FOUND/);
    await expect(owner.mutation(api.products.createProduct, { selectedBusinessId: "foreign", sku: "DENIED", productName: "Denied", sellingPriceCents: 100, unitCostCents: 10 })).rejects.toThrow(/FORBIDDEN/);
  });

  it("paginates pending approvals independently of completed history", async () => {
    const { owner, submit, businessId } = await setup();
    await submit("baseline");
    const pending = await submit("pending", 2000);
    const page = await owner.query(api.intake.listIntakes, { businessId, status: "pending", paginationOpts: { numItems: 1, cursor: null } });
    expect(page.page.map(row => row.id)).toEqual([pending.intakeId]);
    expect(page.isDone).toBe(true);
  });
});
