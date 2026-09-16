import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as intelligence from "../../convex/inventoryIntelligence";
import * as onboarding from "../../convex/onboarding";
import * as generatedApi from "../../convex/_generated/api";
const create = () => convexTest(schema, { "inventoryIntelligence.ts": async () => intelligence, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generatedApi });
async function setup() {
  const t = create(), owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic" });
  const productId = await t.run(ctx => ctx.db.insert("products", { businessId, sku: "fixture", productName: "Synthetic product", unitCostCents: 100, sellingPriceCents: 150, quantityOnHandGrams: 1.25, reorderLevelGrams: 10, allowFractionalWeight: true, isActive: true, createdAt: 1, updatedAt: 1 }));
  return { t, owner, businessId, productId, args: { businessId, productId, expectedUserId: "owner", requestId: "analysis-one" } };
}
it("atomically saves intelligence and alerts once, retaining fractional velocity and offline occurrence dates", async () => {
  const { t, owner, businessId, productId, args } = await setup();
  await t.run(async ctx => {
    for (const [orderStatus, days, quantity] of [["completed", 1, 2.5], ["completed", 40, 7.25], ["cancelled", 1, 100], ["refunded", 1, 100], ["pending", 1, 100]] as const) {
      const saleId = await ctx.db.insert("sales", { businessId, orderNumber: `${orderStatus}-${days}`, orderStatus, subtotalCents: 100, taxAmountCents: 0, totalAmountCents: 100, amountPaidCents: 100, changeAmountCents: 0, paymentMethod: "cash", createdBy: "owner", occurredAt: Date.now() - days * 86400000, createdAt: Date.now(), updatedAt: Date.now() });
      await ctx.db.insert("salesLineItems", { saleId, productId, quantityGrams: quantity, unitPriceCents: 100, lineTotalCents: 100, unitCostCents: 50, createdAt: Date.now() });
    }
  });
  const first = await owner.mutation(api.inventoryIntelligence.analyzeProduct, args), result = JSON.parse(first.resultJson);
  expect(result.units7d).toBe(2.5); expect(result.units30d).toBe(2.5); expect(result.units90d).toBe(9.75);
  expect(result.velocity.velocity7d).toBe(2.5 / 7); expect(result.forecast.restockUrgency).toBe("critical");
  await t.run(ctx => ctx.db.patch(productId, { quantityOnHandGrams: 500 }));
  expect(await owner.mutation(api.inventoryIntelligence.analyzeProduct, args)).toEqual(first);
  expect(await t.run(ctx => ctx.db.query("inventoryAnalyses").collect())).toHaveLength(1);
  expect(await t.run(ctx => ctx.db.query("inventoryIntelligenceAlerts").collect())).toHaveLength(result.alerts.length);
  const audit = await t.run(ctx => ctx.db.query("auditEvents").filter(q => q.eq(q.field("action"), "analyze_inventory")).collect());
  expect(audit).toHaveLength(1); expect(JSON.stringify(audit)).not.toContain("Synthetic product");
  const changed = await t.run(ctx => ctx.db.insert("products", { businessId, sku: "second", productName: "Second", unitCostCents: 100, sellingPriceCents: 150, quantityOnHandGrams: 0, reorderLevelGrams: 10, allowFractionalWeight: true, isActive: true, createdAt: 1, updatedAt: 1 }));
  await expect(owner.mutation(api.inventoryIntelligence.analyzeProduct, { ...args, productId: changed })).rejects.toThrow(/CONFLICT/);
});
it("rejects foreign products and staff before creating records", async () => {
  const { t, owner, businessId, productId, args } = await setup();
  const foreign = t.withIdentity({ subject: "foreign" });
  const other = await foreign.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  await expect(foreign.mutation(api.inventoryIntelligence.analyzeProduct, { ...args, expectedUserId: "foreign", businessId: other.businessId })).rejects.toThrow(/NOT_FOUND/);
  await t.run(ctx => ctx.db.insert("users", { businessId, clerkUserId: "staff", email: "fixture@example.invalid", role: "MEMBER", status: "ACTIVE", createdAt: 1, updatedAt: 1 }));
  await expect(t.withIdentity({ subject: "staff" }).mutation(api.inventoryIntelligence.analyzeProduct, { ...args, expectedUserId: "staff" })).rejects.toThrow(/FORBIDDEN/);
  await expect(owner.mutation(api.inventoryIntelligence.analyzeProduct, { ...args, expectedUserId: "foreign" })).rejects.toThrow(/FORBIDDEN/);
  await t.run(ctx => ctx.db.patch(productId, { unitCostCents: 1.5 }));
  await expect(owner.mutation(api.inventoryIntelligence.analyzeProduct, args)).rejects.toThrow(/INVALID_STATE/);
  expect(await t.run(ctx => ctx.db.query("inventoryAnalyses").collect())).toHaveLength(0);
  expect(await t.run(ctx => ctx.db.query("inventoryIntelligenceAlerts").collect())).toHaveLength(0);
});
it("refuses an incomplete bounded history without saving partial intelligence", async () => {
  const { t, owner, businessId, productId, args } = await setup();
  await t.run(async ctx => {
    const saleId = await ctx.db.insert("sales", { businessId, orderNumber: "large-fixture", orderStatus: "completed", subtotalCents: 100, taxAmountCents: 0, totalAmountCents: 100, amountPaidCents: 100, changeAmountCents: 0, paymentMethod: "cash", createdBy: "owner", createdAt: 1, updatedAt: 1 });
    for (let i = 0; i < 4097; i++) await ctx.db.insert("salesLineItems", { saleId, productId, quantityGrams: 1, unitPriceCents: 100, lineTotalCents: 100, unitCostCents: 50, createdAt: 1 });
  });
  await expect(owner.mutation(api.inventoryIntelligence.analyzeProduct, args)).rejects.toThrow(/CAPACITY_EXCEEDED/);
  expect(await t.run(ctx => ctx.db.query("inventoryAnalyses").collect())).toHaveLength(0);
});

it("rejects a cross-business sale reference instead of incorporating its quantity", async () => {
  const { t, owner, productId, args } = await setup();
  const other = await t.withIdentity({ subject: "foreign" }).mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  await t.run(async ctx => {
    const saleId = await ctx.db.insert("sales", { businessId: other.businessId, orderNumber: "foreign-fixture", orderStatus: "completed", subtotalCents: 100, taxAmountCents: 0, totalAmountCents: 100, amountPaidCents: 100, changeAmountCents: 0, paymentMethod: "cash", createdBy: "foreign", createdAt: Date.now(), updatedAt: Date.now() });
    await ctx.db.insert("salesLineItems", { saleId, productId, quantityGrams: 100, unitPriceCents: 100, lineTotalCents: 100, unitCostCents: 50, createdAt: Date.now() });
  });
  await expect(owner.mutation(api.inventoryIntelligence.analyzeProduct, args)).rejects.toThrow(/INVALID_STATE/);
  expect(await t.run(ctx => ctx.db.query("inventoryAnalyses").collect())).toHaveLength(0);
  expect(await t.run(ctx => ctx.db.query("inventoryIntelligenceAlerts").collect())).toHaveLength(0);
});
it("reads the saved analysis and acknowledges its alerts with one content-free audit", async () => {
  const { t, owner, args } = await setup();
  const receipt = await owner.mutation(api.inventoryIntelligence.analyzeProduct, args);
  const scope = { businessId: args.businessId, expectedUserId: args.expectedUserId };
  expect(await owner.query(api.inventoryIntelligence.latestProductAnalysis, { ...scope, productId: args.productId })).toMatchObject(receipt);
  expect(JSON.parse(receipt.resultJson).pricing.factors.inventory_analysis.daysSupply).toBeNull();
  const alerts = await owner.query(api.inventoryIntelligence.unreadAlerts, scope);
  expect(alerts.length).toBeGreaterThan(0);
  const payload = { ...scope, alertId: alerts[0].id };
  expect(await owner.mutation(api.inventoryIntelligence.acknowledgeAlert, payload)).toEqual({ success: true, status: "acknowledged" });
  expect(await owner.mutation(api.inventoryIntelligence.acknowledgeAlert, payload)).toEqual({ success: true, status: "acknowledged" });
  expect((await owner.query(api.inventoryIntelligence.unreadAlerts, scope)).some(row => row.id === payload.alertId)).toBe(false);
  const audit = await t.run(ctx => ctx.db.query("auditEvents").filter(q => q.eq(q.field("action"), "acknowledge_inventory_alert")).collect());
  expect(audit).toHaveLength(1); expect(JSON.stringify(audit)).not.toContain("Synthetic product");
});
it("filters severity before applying the unread limit and orders newest first", async () => {
  const { t, owner, args } = await setup();
  const receipt = await owner.mutation(api.inventoryIntelligence.analyzeProduct, args);
  await t.run(async ctx => {
    for (const severity of ["low", "critical"] as const) {
      for (let i = 0; i < 105; i++) await ctx.db.insert("inventoryIntelligenceAlerts", { businessId: args.businessId, productId: args.productId, analysisId: receipt.analysisId, severity, alertType: "fixture", message: "Synthetic", isRead: false, createdAt: i + (severity === "low" ? 1000 : 0) });
    }
  });
  const rows = await owner.query(api.inventoryIntelligence.unreadAlerts, { businessId: args.businessId, expectedUserId: "owner", severity: "critical" });
  expect(rows).toHaveLength(100); expect(rows.every(row => row.severity === "critical")).toBe(true);
  expect(rows[0].created_at).toBe(new Date(104).toISOString());
  expect(rows.at(-1)?.created_at).toBe(new Date(5).toISOString());
});
it("prevents foreign and revoked members from reading or acknowledging canonical alerts", async () => {
  const { t, owner, args } = await setup();
  await owner.mutation(api.inventoryIntelligence.analyzeProduct, args);
  const scope = { businessId: args.businessId, expectedUserId: "owner" };
  const [alert] = await owner.query(api.inventoryIntelligence.unreadAlerts, scope);
  const foreign = t.withIdentity({ subject: "foreign" });
  const other = await foreign.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  const otherScope = { businessId: other.businessId, expectedUserId: "foreign" };
  expect(await foreign.query(api.inventoryIntelligence.unreadAlerts, otherScope)).toEqual([]);
  await expect(foreign.mutation(api.inventoryIntelligence.acknowledgeAlert, { ...otherScope, alertId: alert.id })).rejects.toThrow(/NOT_FOUND/);
  await expect(foreign.query(api.inventoryIntelligence.latestProductAnalysis, { ...otherScope, productId: args.productId })).rejects.toThrow(/NOT_FOUND/);
  await t.run(async ctx => {
    const member = await ctx.db.query("users").withIndex("by_clerkUserId_and_businessId", q => q.eq("clerkUserId", "owner").eq("businessId", args.businessId)).unique();
    if (!member) throw new Error("Missing fixture membership");
    await ctx.db.patch(member._id, { status: "SUSPENDED" });
  });
  await expect(owner.query(api.inventoryIntelligence.unreadAlerts, scope)).rejects.toThrow(/FORBIDDEN/);
  await expect(owner.mutation(api.inventoryIntelligence.acknowledgeAlert, { ...scope, alertId: alert.id })).rejects.toThrow(/FORBIDDEN/);
  expect((await t.run(ctx => ctx.db.get(alert.id)))?.isRead).toBe(false);
});
it("preserves operator analysis options and rejects changed retries before new writes", async () => {
  const { t, owner, args } = await setup();
  const options = { marginRequirement: 0.5, supplierLeadTimeDays: 2, minPrice: 2, maxPrice: 2, restockCost: 2.125 };
  const receipt = await owner.mutation(api.inventoryIntelligence.analyzeProduct, { ...args, options });
  const result = JSON.parse(receipt.resultJson);
  expect(result.pricing.recommendedPrice).toBe(2);
  expect(result.forecast.factors.estimated_restock_cost).toBeCloseTo(result.forecast.recommendedRestockQuantity * 2.125);
  expect(await owner.mutation(api.inventoryIntelligence.analyzeProduct, { ...args, options: { ...options } })).toEqual(receipt);
  await expect(owner.mutation(api.inventoryIntelligence.analyzeProduct, { ...args, options: { ...options, supplierLeadTimeDays: 3 } })).rejects.toThrow(/CONFLICT/);
  expect(await t.run(ctx => ctx.db.query("inventoryAnalyses").collect())).toHaveLength(1);
});
it("treats explicit defaults as the same request and binds batch settings", async () => {
  const { owner, args } = await setup();
  const receipt = await owner.mutation(api.inventoryIntelligence.analyzeProduct, args);
  expect(await owner.mutation(api.inventoryIntelligence.analyzeProduct, { ...args, options: { marginRequirement: 0.3, supplierLeadTimeDays: 7 } })).toEqual(receipt);
  const batch = { businessId: args.businessId, expectedUserId: args.expectedUserId, requestId: "options-batch", options: { minPrice: 2, maxPrice: 2 } };
  const summary = await owner.action(api.inventoryIntelligence.analyzeBatch, batch); expect(summary.processed_count).toBe(1);
  await expect(owner.action(api.inventoryIntelligence.analyzeBatch, { ...batch, options: { minPrice: 3, maxPrice: 3 } })).rejects.toThrow(/CONFLICT/);
});
it.each([{ marginRequirement: -1 }, { marginRequirement: 11 }, { supplierLeadTimeDays: 1.5 }, { supplierLeadTimeDays: 366 }, { restockCost: -1 }, { minPrice: 3, maxPrice: 2 }])("rejects invalid analysis settings without persistence: %j", async options => {
  const { t, owner, args } = await setup();
  await expect(owner.mutation(api.inventoryIntelligence.analyzeProduct, { ...args, options })).rejects.toThrow(/INVALID_ARGUMENT/);
  expect(await t.run(ctx => ctx.db.query("inventoryAnalyses").collect())).toHaveLength(0);
});
it("separates analysis modes, permissions and latest results without replacing the other kind", async () => {
  const { t, owner, businessId, productId, args } = await setup();
  await t.run(async ctx => {
    for (const [clerkUserId, grant] of [["pricer", "pricing.manage"], ["stock", "inventory.manage"]]) await ctx.db.insert("users", { businessId, clerkUserId, email: `${clerkUserId}@example.invalid`, role: "MEMBER", permissions: { [grant]: true }, status: "ACTIVE", createdAt: 1, updatedAt: 1 });
  });
  const pricer = t.withIdentity({ subject: "pricer" }), stock = t.withIdentity({ subject: "stock" });
  const priceArgs = { ...args, expectedUserId: "pricer", options: { analysisType: "pricing" as const } };
  const priced = await pricer.mutation(api.inventoryIntelligence.analyzeProduct, priceArgs);
  expect(JSON.parse(priced.resultJson).forecast).toBeNull(); expect(JSON.parse(priced.resultJson).alerts).toEqual([]);
  await expect(pricer.mutation(api.inventoryIntelligence.analyzeProduct, { ...priceArgs, options: { analysisType: "inventory" } })).rejects.toThrow(/FORBIDDEN/);
  const inventory = await stock.mutation(api.inventoryIntelligence.analyzeProduct, { ...args, expectedUserId: "stock", options: { analysisType: "inventory" } });
  expect(JSON.parse(inventory.resultJson).pricing).toBeNull();
  await expect(stock.mutation(api.inventoryIntelligence.analyzeProduct, { ...args, expectedUserId: "stock", options: { analysisType: "pricing" } })).rejects.toThrow(/FORBIDDEN/);
  const scope = { businessId, expectedUserId: "owner" };
  const listed = await owner.query(api.inventoryIntelligence.pricingRecommendations, { ...scope, limit: 10 }); expect(listed[0].id).toBe(priced.analysisId);
  const dashboard = JSON.parse(await owner.query(api.inventoryIntelligence.dashboard, scope)); expect(dashboard.counts.pricingRecommendations).toBe(1);
  await expect(owner.mutation(api.inventoryIntelligence.applyPricing, { ...scope, analysisId: inventory.analysisId })).rejects.toThrow(/NOT_FOUND/);
  const summary = await stock.action(api.inventoryIntelligence.analyzeBatch, { businessId, expectedUserId: "stock", requestId: "inventory-batch", options: { analysisType: "inventory" } });
  expect(summary).toMatchObject({ processed_count: 1, forecasts_generated: 1, pricing_generated: 0 });
  const pricingSummary = await pricer.action(api.inventoryIntelligence.analyzeBatch, { businessId, expectedUserId: "pricer", requestId: "pricing-batch", options: { analysisType: "pricing" } });
  expect(pricingSummary).toMatchObject({ processed_count: 1, forecasts_generated: 0, pricing_generated: 1, alerts_created: 0 });
});
it("keeps older all-mode snapshots discoverable and default retries compatible", async () => {
  const { t, owner, businessId, args } = await setup();
  const receipt = await owner.mutation(api.inventoryIntelligence.analyzeProduct, args);
  await t.run(ctx => ctx.db.patch(receipt.analysisId, { hasPricing: undefined, hasForecast: undefined, optionsJson: '{"marginRequirement":0.3,"supplierLeadTimeDays":7}' }));
  expect(await owner.mutation(api.inventoryIntelligence.analyzeProduct, { ...args, options: { analysisType: "all" } })).toEqual(receipt);
  await owner.mutation(api.inventoryIntelligence.analyzeProduct, { ...args, requestId: "inventory-only", options: { analysisType: "inventory" } });
  const scope = { businessId, expectedUserId: "owner" };
  expect((await owner.query(api.inventoryIntelligence.pricingRecommendations, { ...scope, limit: 10 }))[0].id).toBe(receipt.analysisId);
  await expect(owner.mutation(api.inventoryIntelligence.analyzeProduct, { ...args, options: { analysisType: "pricing" } })).rejects.toThrow(/CONFLICT/);
});
it("persists the queued formula profile without generating interactive alerts", async () => {
  const { t, owner, args, productId } = await setup();
  await t.run(ctx => ctx.db.patch(productId, { quantityOnHandGrams: 100, unitCostCents: 10000 }));
  const options = { calculationProfile: "queued" as const };
  const receipt = await owner.mutation(api.inventoryIntelligence.analyzeProduct, { ...args, options });
  const result = JSON.parse(receipt.resultJson);
  expect(result.pricing.recommendedPrice).toBe(119.6); expect(result.forecast.confidenceScore).toBe(40);
  expect(result.forecast.reasoning).toBe("Automated inventory forecast"); expect(result.alerts).toEqual([]);
  expect(await t.run(ctx => ctx.db.query("inventoryIntelligenceAlerts").collect())).toHaveLength(0);
  await expect(owner.mutation(api.inventoryIntelligence.analyzeProduct, args)).rejects.toThrow(/CONFLICT/);
  await expect(owner.mutation(api.inventoryIntelligence.analyzeProduct, { ...args, options: { ...options, minPrice: 2 } })).rejects.toThrow(/INVALID_ARGUMENT/);
  await t.run(ctx => ctx.db.patch(productId, { unitCostCents: 0 }));
  const noCost = await owner.mutation(api.inventoryIntelligence.analyzeProduct, { ...args, requestId: "no-cost", options });
  expect(JSON.parse(noCost.resultJson).pricing).toBeNull();
});
