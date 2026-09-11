import type { AuthenticatedUser } from "./helpers/auth";
import { calculateQueuedInventory } from "../lib/utils/queued-inventory-calculation";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import type { Id, Doc } from "./_generated/dataModel";
import { api, internal } from "./_generated/api";
import type { FunctionReturnType } from "convex/server";
import { mutation, query, action, internalMutation, internalAction } from "./_generated/server";
import { v } from "convex/values";
import { requireSelectedBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { generateInventoryForecast } from "../lib/utils/inventory-forecast";
import { generatePricingRecommendation } from "../lib/utils/pricing-recommendation";
import { readSalesVelocity } from "./helpers/salesVelocity";
const analysisOptions = v.object({ calculationProfile: v.optional(v.union(v.literal("interactive"), v.literal("queued"))), analysisType: v.optional(v.union(v.literal("all"), v.literal("pricing"), v.literal("inventory"))), marginRequirement: v.optional(v.number()), supplierLeadTimeDays: v.optional(v.number()), minPrice: v.optional(v.number()), maxPrice: v.optional(v.number()), restockCost: v.optional(v.number()) });
type AnalysisOptions = { calculationProfile?: "interactive" | "queued"; analysisType?: "all" | "pricing" | "inventory"; marginRequirement?: number; supplierLeadTimeDays?: number; minPrice?: number; maxPrice?: number; restockCost?: number };
function normalizeOptions(input: AnalysisOptions = {}) {
  const options = { calculationProfile: input.calculationProfile ?? "interactive", analysisType: input.analysisType ?? "all", marginRequirement: input.marginRequirement ?? 0.3, supplierLeadTimeDays: input.supplierLeadTimeDays ?? 7, minPrice: input.minPrice, maxPrice: input.maxPrice, restockCost: input.restockCost };
  if (options.calculationProfile === "queued" && [options.minPrice, options.maxPrice, options.restockCost].some(value => value !== undefined)) throw new Error("INVALID_ARGUMENT: Unsupported queued analysis option");
  if (!Number.isFinite(options.marginRequirement) || options.marginRequirement < 0 || options.marginRequirement > 10 || !Number.isInteger(options.supplierLeadTimeDays) || options.supplierLeadTimeDays < 0 || options.supplierLeadTimeDays > 365) throw new Error("INVALID_ARGUMENT: Invalid analysis options");
  for (const value of [options.minPrice, options.maxPrice, options.restockCost]) if (value !== undefined && (!Number.isFinite(value) || value < 0 || value * 100 > Number.MAX_SAFE_INTEGER)) throw new Error("INVALID_ARGUMENT: Invalid analysis amount");
  if (options.minPrice !== undefined && options.maxPrice !== undefined && options.minPrice > options.maxPrice) throw new Error("INVALID_ARGUMENT: Inverted price range");
  return options;
}

async function latestAnalysis(ctx: QueryCtx, businessId: Id<"businesses">, productId: Id<"products">, kind: "pricing" | "inventory") {
  const read = (present: true | undefined) => kind === "pricing"
    ? ctx.db.query("inventoryAnalyses").withIndex("by_businessId_and_productId_and_hasPricing_and_createdAt", q => q.eq("businessId", businessId).eq("productId", productId).eq("hasPricing", present)).order("desc").first()
    : ctx.db.query("inventoryAnalyses").withIndex("by_businessId_and_productId_and_hasForecast_and_createdAt", q => q.eq("businessId", businessId).eq("productId", productId).eq("hasForecast", present)).order("desc").first();
  const [current, legacy] = await Promise.all([read(true), read(undefined)]);
  if (!current) return legacy;
  if (!legacy) return current;
  return current.createdAt > legacy.createdAt || (current.createdAt === legacy.createdAt && current._creationTime >= legacy._creationTime) ? current : legacy;
}

async function saveAnalysis(ctx: MutationCtx, args: { businessId: Id<"businesses">; expectedUserId: string; productId: Id<"products">; requestId: string; options?: AnalysisOptions }, auth: AuthenticatedUser): Promise<{ analysisId: Id<"inventoryAnalyses">; resultJson: string }> {
    const mode = normalizeOptions(args.options).analysisType;
    if (mode !== "pricing") requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    if (mode !== "inventory") requirePermission(auth.userRecord, "MANAGE_PRICING");
    if (!args.requestId.trim() || args.requestId.length > 200) throw new Error("INVALID_ARGUMENT: Invalid analysis request ID");
    const options = normalizeOptions(args.options), optionsJson = JSON.stringify(options);
    const previous = await ctx.db.query("inventoryAnalyses").withIndex("by_businessId_and_actorId_and_requestId", q => q.eq("businessId", auth.businessId).eq("actorId", auth.userId).eq("requestId", args.requestId)).unique();
    if (previous) {
      if (previous.productId !== args.productId || (JSON.stringify(normalizeOptions(previous.optionsJson ? JSON.parse(previous.optionsJson) : undefined))) !== optionsJson) throw new Error("CONFLICT: Analysis retry differs");
      return { analysisId: previous._id, resultJson: previous.resultJson };
    }
    const product = await ctx.db.get(args.productId);
    if (!product || product.businessId !== auth.businessId || !product.isActive) throw new Error("NOT_FOUND: Product unavailable");
    for (const value of [product.quantityOnHandGrams, product.reorderLevelGrams, product.unitCostCents, product.sellingPriceCents]) {
      if (!Number.isFinite(value) || value < 0) throw new Error("INVALID_STATE: Invalid inventory analysis input");
    }
    if (![product.unitCostCents, product.sellingPriceCents].every(Number.isSafeInteger)) throw new Error("INVALID_STATE: Invalid money input");
    const now = Date.now();
    const { units, velocity } = await readSalesVelocity(ctx, auth.businessId, product._id, now);
    const legacyVelocity = { velocity_7d: velocity.velocity7d, velocity_30d: velocity.velocity30d, velocity_90d: velocity.velocity90d };
    const queued = options.calculationProfile === "queued" ? calculateQueuedInventory({ analysisType: options.analysisType, marginRequirement: options.marginRequirement, currentStock: product.quantityOnHandGrams, reorderLevel: product.reorderLevelGrams, unitCost: product.unitCostCents / 100, velocity: legacyVelocity }, now) : null;
    const forecast = queued ? (queued.forecast ? {
      projectedStockoutDate: queued.forecast.projected_stockout_date, daysUntilStockout: queued.forecast.days_until_stockout,
      recommendedRestockQuantity: queued.forecast.recommended_restock, restockUrgency: queued.forecast.urgency,
      inventoryRiskLevel: queued.forecast.risk_level, reasoning: "Automated inventory forecast", confidenceScore: queued.forecast.confidence,
      factors: { velocity: legacyVelocity }, velocityTrend: velocity.velocity7d > velocity.velocity30d ? "accelerating" : "stable",
    } : null) : (options.analysisType === "pricing" ? null : generateInventoryForecast({ ...velocity, currentStock: product.quantityOnHandGrams, reorderLevel: product.reorderLevelGrams, supplierLeadTimeDays: options.supplierLeadTimeDays, restockCost: options.restockCost }, now));
    const pricing = queued ? (queued.pricingRec ? {
      recommendedPrice: queued.pricingRec.recommended_price, recommendedRangeMin: queued.pricingRec.range_min, recommendedRangeMax: queued.pricingRec.range_max,
      confidenceScore: queued.pricingRec.confidence, reasoning: "Automated pricing recommendation", factors: { velocity: legacyVelocity, daysSupply: product.quantityOnHandGrams / Math.max(velocity.velocity7d, 0.01) },
    } : null) : (options.analysisType === "inventory" ? null : generatePricingRecommendation({ cost: product.unitCostCents / 100, currentPrice: product.sellingPriceCents / 100, costHistory: [], currentStock: product.quantityOnHandGrams, salesVelocity7d: velocity.velocity7d, salesVelocity30d: velocity.velocity30d, marginRequirement: options.marginRequirement, minPrice: options.minPrice, maxPrice: options.maxPrice }));
    const alerts: Array<{ alertType: string; severity: "high" | "critical" | "medium"; message: string }> = [];
    if (!queued && forecast && forecast.inventoryRiskLevel === "high" && forecast.velocityTrend === "stagnant") alerts.push({ alertType: "overstock_risk", severity: "high", message: `Overstock risk: ${product.productName} has high inventory but no sales velocity. Consider price adjustment or promotions.` });
    if (!queued && forecast && (forecast.restockUrgency === "critical" || forecast.restockUrgency === "high")) alerts.push({ alertType: "stockout_risk", severity: forecast.restockUrgency, message: `Stock at risk: ${product.productName} projected to stock out in ${forecast.daysUntilStockout} days.` });
    if (!queued && forecast?.velocityTrend === "accelerating") alerts.push({ alertType: "demand_spike", severity: "medium", message: `Demand acceleration detected for ${product.productName}. Sales velocity increasing. Monitor stock levels closely.` });
    const resultJson = JSON.stringify({ basePriceCents: product.sellingPriceCents, forecast, pricing, velocity, units7d: units[0], units30d: units[1], units90d: units[2], alerts, analyzedAt: now }, (_key, value) => {
      if (typeof value === "number" && !Number.isFinite(value)) throw new Error("INVALID_STATE: Non-finite analysis result");
      return value;
    });
    const analysisId = await ctx.db.insert("inventoryAnalyses", { businessId: auth.businessId, productId: product._id, actorId: auth.userId, requestId: args.requestId, optionsJson, hasPricing: pricing !== null, hasForecast: forecast !== null, resultJson, createdAt: now });
    const savedAlerts = [];
    for (const alert of alerts) {
      const id = await ctx.db.insert("inventoryIntelligenceAlerts", { ...alert, businessId: auth.businessId, productId: product._id, analysisId, isRead: false, createdAt: now });
      savedAlerts.push({ id, type: alert.alertType, severity: alert.severity, message: alert.message });
    }
    const savedResultJson = JSON.stringify({ ...JSON.parse(resultJson), alerts: savedAlerts });
    await ctx.db.patch(analysisId, { resultJson: savedResultJson });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "analyze_inventory", entityType: "inventory_analysis", entityId: analysisId, metadata: JSON.stringify({ alertCount: alerts.length }), timestamp: now });
    return { analysisId, resultJson: savedResultJson };
}

export const analyzeProduct = mutation({
  args: { businessId: v.id("businesses"), expectedUserId: v.string(), productId: v.id("products"), requestId: v.string(), options: v.optional(analysisOptions) },
  returns: v.object({ analysisId: v.id("inventoryAnalyses"), resultJson: v.string() }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    return saveAnalysis(ctx, args, auth);
  },
});

const severity = v.union(v.literal("low"), v.literal("medium"), v.literal("high"), v.literal("critical"));
export const latestProductAnalysis = query({
  args: { businessId: v.id("businesses"), expectedUserId: v.string(), productId: v.id("products") },
  returns: v.union(v.null(), v.object({ analysisId: v.id("inventoryAnalyses"), resultJson: v.string(), createdAt: v.number() })),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_INVENTORY"); requirePermission(auth.userRecord, "MANAGE_PRICING");
    const product = await ctx.db.get(args.productId);
    if (!product || product.businessId !== auth.businessId) throw new Error("NOT_FOUND: Product unavailable");
    const row = await ctx.db.query("inventoryAnalyses").withIndex("by_businessId_and_productId_and_createdAt", q => q.eq("businessId", auth.businessId).eq("productId", product._id)).order("desc").first();
    return row ? { analysisId: row._id, resultJson: row.resultJson, createdAt: row.createdAt } : null;
  },
});
export const unreadAlerts = query({
  args: { businessId: v.id("businesses"), expectedUserId: v.string(), severity: v.optional(severity) },
  returns: v.array(v.object({ id: v.id("inventoryIntelligenceAlerts"), inventory_id: v.id("products"), alert_type: v.string(), severity, message: v.string(), created_at: v.string() })),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    const rows = args.severity
      ? await ctx.db.query("inventoryIntelligenceAlerts").withIndex("by_businessId_and_isRead_and_severity_and_createdAt", q => q.eq("businessId", auth.businessId).eq("isRead", false).eq("severity", args.severity!)).order("desc").take(100)
      : await ctx.db.query("inventoryIntelligenceAlerts").withIndex("by_businessId_and_isRead_and_createdAt", q => q.eq("businessId", auth.businessId).eq("isRead", false)).order("desc").take(100);
    return rows.map(row => ({ id: row._id, inventory_id: row.productId, alert_type: row.alertType, severity: row.severity, message: row.message, created_at: new Date(row.createdAt).toISOString() }));
  },
});
export const acknowledgeAlert = mutation({
  args: { businessId: v.id("businesses"), expectedUserId: v.string(), alertId: v.id("inventoryIntelligenceAlerts") },
  returns: v.object({ success: v.literal(true), status: v.literal("acknowledged") }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    const alert = await ctx.db.get(args.alertId);
    if (!alert || alert.businessId !== auth.businessId) throw new Error("NOT_FOUND: Alert unavailable");
    if (!alert.isRead) {
      await ctx.db.patch(alert._id, { isRead: true });
      await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "acknowledge_inventory_alert", entityType: "inventory_alert", entityId: alert._id, metadata: JSON.stringify({ isRead: true }), timestamp: Date.now() });
    }
    return { success: true as const, status: "acknowledged" as const };
  },
});

export const resolveScope = query({
  args: { businessId: v.string(), expectedUserId: v.string(), productId: v.optional(v.string()) },
  returns: v.object({ businessId: v.id("businesses"), productId: v.optional(v.id("products")) }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    if (!args.productId) return { businessId: auth.businessId };
    const id = ctx.db.normalizeId("products", args.productId);
    const product = id ? await ctx.db.get(id) : await ctx.db.query("products").withIndex("by_businessId_and_legacyPrismaId", q => q.eq("businessId", auth.businessId).eq("legacyPrismaId", args.productId)).unique();
    if (!product || product.businessId !== auth.businessId || !product.isActive) throw new Error("NOT_FOUND: Product unavailable");
    return { businessId: auth.businessId, productId: product._id };
  },
});
async function prepareRun(ctx: MutationCtx, args: { businessId: Id<"businesses">; expectedUserId: string; requestId: string; options?: AnalysisOptions }, auth: AuthenticatedUser): Promise<{ runId: Id<"inventoryAnalysisRuns">; productIds: Id<"products">[]; createdAt: number }> {
    const mode = normalizeOptions(args.options).analysisType;
    if (mode !== "pricing") requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    if (mode !== "inventory") requirePermission(auth.userRecord, "MANAGE_PRICING");
    if (!args.requestId.trim() || args.requestId.length > 100) throw new Error("INVALID_ARGUMENT: Invalid batch request ID");
    const optionsJson = JSON.stringify(normalizeOptions(args.options));
    const previous = await ctx.db.query("inventoryAnalysisRuns").withIndex("by_businessId_and_actorId_and_requestId", q => q.eq("businessId", auth.businessId).eq("actorId", auth.userId).eq("requestId", args.requestId)).unique();
    if (previous) {
      if ((JSON.stringify(normalizeOptions(previous.optionsJson ? JSON.parse(previous.optionsJson) : undefined))) !== optionsJson) throw new Error("CONFLICT: Batch retry options changed");
      return { runId: previous._id, productIds: previous.productIds, createdAt: previous.createdAt };
    }
    const products = await ctx.db.query("products").withIndex("by_businessId_and_isActive", q => q.eq("businessId", auth.businessId).eq("isActive", true)).take(1001);
    if (products.length > 1000) throw new Error("CAPACITY_EXCEEDED: Batch catalog requires pagination");
    const productIds = products.map(product => product._id), createdAt = Date.now();
    const runId = await ctx.db.insert("inventoryAnalysisRuns", { businessId: auth.businessId, actorId: auth.userId, requestId: args.requestId, optionsJson, productIds, createdAt });
    return { runId, productIds, createdAt };
}

export const prepareBatch = mutation({
  args: { businessId: v.id("businesses"), expectedUserId: v.string(), requestId: v.string(), options: v.optional(analysisOptions) },
  returns: v.object({ runId: v.id("inventoryAnalysisRuns"), productIds: v.array(v.id("products")), createdAt: v.number() }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    return prepareRun(ctx, args, auth);
  },
});
export const analyzeBatch = action({
  args: { businessId: v.id("businesses"), expectedUserId: v.string(), requestId: v.string(), options: v.optional(analysisOptions) },
  returns: v.object({ total_analyzed: v.number(), pricing_generated: v.number(), forecasts_generated: v.number(), alerts_created: v.number(), processed_count: v.number(), error_count: v.number() }),
  handler: async (ctx, args): Promise<{ total_analyzed: number; pricing_generated: number; forecasts_generated: number; alerts_created: number; processed_count: number; error_count: number }> => {
    const run: FunctionReturnType<typeof api.inventoryIntelligence.prepareBatch> = await ctx.runMutation(api.inventoryIntelligence.prepareBatch, args);
    let alerts = 0, pricingCount = 0, forecastCount = 0;
    for (const productId of run.productIds) {
      const result: FunctionReturnType<typeof api.inventoryIntelligence.analyzeProduct> = await ctx.runMutation(api.inventoryIntelligence.analyzeProduct, { businessId: args.businessId, expectedUserId: args.expectedUserId, productId, requestId: `${run.runId}:${productId}`, options: args.options });
      const saved = JSON.parse(result.resultJson);
      alerts += saved.alerts.length; pricingCount += saved.pricing ? 1 : 0; forecastCount += saved.forecast ? 1 : 0;
    }
    const count = run.productIds.length;
    return { total_analyzed: count, pricing_generated: pricingCount, forecasts_generated: forecastCount, alerts_created: alerts, processed_count: count, error_count: 0 };
  },
});
export const dashboard = query({
  args: { businessId: v.id("businesses"), expectedUserId: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_INVENTORY"); requirePermission(auth.userRecord, "MANAGE_PRICING");
    const products = await ctx.db.query("products").withIndex("by_businessId_and_isActive", q => q.eq("businessId", auth.businessId).eq("isActive", true)).take(1001);
    const alerts = await ctx.db.query("inventoryIntelligenceAlerts").withIndex("by_businessId_and_isRead_and_createdAt", q => q.eq("businessId", auth.businessId).eq("isRead", false)).order("desc").take(4097);
    if (products.length > 1000 || alerts.length > 4096) throw new Error("CAPACITY_EXCEEDED: Dashboard requires pagination");
    const pricingRecommendations = [], forecasts = [];
    for (const product of products) {
      const row = await latestAnalysis(ctx, auth.businessId, product._id, "pricing");
      if (row && row.appliedAt === undefined) {
        const result = JSON.parse(row.resultJson);
        if (result.pricing) pricingRecommendations.push({ id: row._id, inventoryId: product._id, ...result.pricing });
      }
      const forecastRow = await latestAnalysis(ctx, auth.businessId, product._id, "inventory");
      if (forecastRow) {
        const result = JSON.parse(forecastRow.resultJson);
        if (result.forecast && ["high", "critical"].includes(result.forecast.restockUrgency)) forecasts.push({ id: forecastRow._id, inventoryId: product._id, ...result.forecast, createdAt: forecastRow.createdAt });
      }
    }
    const critical = alerts.filter(alert => ["high", "critical"].includes(alert.severity));
    return JSON.stringify({ pricingRecommendations: pricingRecommendations.sort((a, b) => b.confidenceScore - a.confidenceScore).slice(0, 20), forecasts: forecasts.sort((a, b) => b.createdAt - a.createdAt).slice(0, 20), alerts: critical.slice(0, 30).map(row => ({ id: row._id, inventoryId: row.productId, severity: row.severity, message: row.message, alertType: row.alertType })), counts: { pricingRecommendations: pricingRecommendations.length, criticalAlerts: critical.length, urgentRestocks: forecasts.length, opportunitiesCount: pricingRecommendations.length + forecasts.length } });
  },
});

export const applyPricing = mutation({
  args: { businessId: v.id("businesses"), expectedUserId: v.string(), analysisId: v.id("inventoryAnalyses") },
  returns: v.object({ success: v.literal(true), newPrice: v.number() }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId); requirePermission(auth.userRecord, "MANAGE_PRICING");
    const row = await ctx.db.get(args.analysisId);
    if (!row || row.businessId !== auth.businessId) throw new Error("NOT_FOUND: Recommendation unavailable");
    if (row.appliedAt !== undefined && row.appliedPriceCents !== undefined) return { success: true as const, newPrice: row.appliedPriceCents / 100 };
    const product = await ctx.db.get(row.productId);
    if (!product || product.businessId !== auth.businessId || !product.isActive) throw new Error("NOT_FOUND: Product unavailable");
    const snapshot = JSON.parse(row.resultJson);
    if (!snapshot.pricing) throw new Error("NOT_FOUND: Pricing recommendation unavailable");
    const cents = Math.round(snapshot.pricing.recommendedPrice * 100);
    if (!Number.isSafeInteger(snapshot.basePriceCents) || !Number.isSafeInteger(cents) || cents <= 0) throw new Error("INVALID_STATE: Recommendation requires reconciliation");
    if (product.sellingPriceCents !== snapshot.basePriceCents) throw new Error("STALE_PRICE: Product price changed. Generate a new analysis.");
    const now = Date.now();
    await ctx.db.patch(product._id, { sellingPriceCents: cents, updatedAt: now });
    await ctx.db.patch(row._id, { appliedAt: now, appliedPriceCents: cents });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "apply_inventory_pricing", entityType: "inventory_analysis", entityId: row._id, metadata: JSON.stringify({ oldPriceCents: product.sellingPriceCents, newPriceCents: cents }), timestamp: now });
    return { success: true as const, newPrice: cents / 100 };
  },
});

export const pricingRecommendations = query({
  args: { businessId: v.id("businesses"), expectedUserId: v.string(), limit: v.number() },
  returns: v.array(v.object({ id: v.id("inventoryAnalyses"), recommendation_id: v.id("inventoryAnalyses"), inventory_id: v.id("products"), product_name: v.string(), current_price: v.number(), recommended_price: v.number(), confidence_score: v.number(), price_change_percentage: v.union(v.number(), v.null()), recommendation_reason: v.string() })),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId); requirePermission(auth.userRecord, "MANAGE_PRICING");
    if (!Number.isSafeInteger(args.limit) || args.limit < 1 || args.limit > 100) throw new Error("INVALID_ARGUMENT: Invalid pricing limit");
    const products = await ctx.db.query("products").withIndex("by_businessId_and_isActive", q => q.eq("businessId", auth.businessId).eq("isActive", true)).take(1001);
    if (products.length > 1000) throw new Error("CAPACITY_EXCEEDED: Pricing catalog requires pagination");
    const rows = [];
    for (const product of products) {
      const analysis = await latestAnalysis(ctx, auth.businessId, product._id, "pricing");
      if (!analysis || analysis.appliedAt !== undefined) continue;
      const result = JSON.parse(analysis.resultJson);
      if (result.basePriceCents !== product.sellingPriceCents) continue;
      const pricing = result.pricing, currentPrice = product.sellingPriceCents / 100;
      if (![pricing.recommendedPrice, pricing.confidenceScore].every(Number.isFinite)) throw new Error("INVALID_STATE: Invalid saved pricing");
      rows.push({ id: analysis._id, recommendation_id: analysis._id, inventory_id: product._id, product_name: product.productName, current_price: currentPrice, recommended_price: pricing.recommendedPrice as number, confidence_score: pricing.confidenceScore as number, price_change_percentage: currentPrice === 0 ? null : (pricing.recommendedPrice - currentPrice) / currentPrice * 100, recommendation_reason: pricing.reasoning as string });
    }
    return rows.sort((a, b) => b.confidence_score - a.confidence_score || a.id.localeCompare(b.id)).slice(0, args.limit);
  },
});

async function queuedActor(ctx: MutationCtx, run: Doc<"inventoryAnalysisRuns">): Promise<AuthenticatedUser> {
  const business = await ctx.db.get(run.businessId);
  const user = await ctx.db.query("users").withIndex("by_clerkUserId_and_businessId", q => q.eq("clerkUserId", run.actorId).eq("businessId", run.businessId)).unique();
  if (!business || business.isActive === false || !user || user.status !== "ACTIVE") throw new Error("FORBIDDEN: Queued authority is no longer active");
  return { userId: run.actorId, email: user.email, userRecord: user, businessRecord: business, businessId: run.businessId };
}
export const enqueueAnalysis = mutation({
  args: { businessId: v.id("businesses"), expectedUserId: v.string(), requestId: v.string(), options: v.optional(analysisOptions) },
  returns: v.object({ jobId: v.id("inventoryAnalysisRuns"), status: v.union(v.literal("queued"), v.literal("complete"), v.literal("failed")) }),
  handler: async (ctx, args): Promise<{ jobId: Id<"inventoryAnalysisRuns">; status: "queued" | "complete" | "failed" }> => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    const options = normalizeOptions({ ...args.options, calculationProfile: "queued" });
    const prepared = await prepareRun(ctx, { ...args, options }, auth);
    const run = await ctx.db.get(prepared.runId); if (!run) throw new Error("INVALID_STATE: Missing prepared job");
    if (run.status === "complete") return { jobId: run._id, status: "complete" };
    if (run.status === "queued" && run.scheduledId) {
      const scheduled = await ctx.db.system.get(run.scheduledId);
      if (scheduled?.state.kind === "pending" || scheduled?.state.kind === "inProgress") return { jobId: run._id, status: "queued" };
    }
    const nextIndex = run.nextIndex ?? 0;
    if (!Number.isSafeInteger(nextIndex) || nextIndex < 0 || nextIndex > run.productIds.length) throw new Error("INVALID_STATE: Invalid job progress");
    if (nextIndex === run.productIds.length) { await ctx.db.patch(run._id, { status: "complete", nextIndex, failureCode: undefined }); return { jobId: run._id, status: "complete" }; }
    const scheduledId = await ctx.scheduler.runAfter(0, internal.inventoryIntelligence.processQueued, { runId: run._id, expectedIndex: nextIndex });
    await ctx.db.patch(run._id, { status: "queued", nextIndex, failureCode: undefined, scheduledId });
    return { jobId: run._id, status: "queued" };
  },
});
export const processQueuedStep = internalMutation({
  args: { runId: v.id("inventoryAnalysisRuns"), expectedIndex: v.number() }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    const run = await ctx.db.get(args.runId);
    if (!run || run.status !== "queued" || run.nextIndex !== args.expectedIndex) return null;
    if (!Number.isSafeInteger(args.expectedIndex) || args.expectedIndex < 0 || args.expectedIndex >= run.productIds.length) throw new Error("INVALID_STATE: Invalid queued progress");
    const auth = await queuedActor(ctx, run), options = normalizeOptions(run.optionsJson ? JSON.parse(run.optionsJson) : undefined);
    if (options.calculationProfile !== "queued") throw new Error("INVALID_STATE: Queued profile missing");
    const productId = run.productIds[args.expectedIndex];
    const saved = await saveAnalysis(ctx, { businessId: run.businessId, expectedUserId: run.actorId, productId, requestId: `${run._id}:${productId}`, options }, auth);
    const result = JSON.parse(saved.resultJson), nextIndex = args.expectedIndex + 1;
    const scheduledId = nextIndex < run.productIds.length ? await ctx.scheduler.runAfter(0, internal.inventoryIntelligence.processQueued, { runId: run._id, expectedIndex: nextIndex }) : undefined;
    await ctx.db.patch(run._id, { nextIndex, status: nextIndex === run.productIds.length ? "complete" : "queued", scheduledId, failureCode: undefined, pricingGenerated: (run.pricingGenerated ?? 0) + (result.pricing ? 1 : 0), forecastsGenerated: (run.forecastsGenerated ?? 0) + (result.forecast ? 1 : 0) });
    return null;
  },
});
export const markQueuedFailure = internalMutation({
  args: { runId: v.id("inventoryAnalysisRuns"), expectedIndex: v.number(), code: v.string() }, returns: v.null(),
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (run?.status === "queued" && run.nextIndex === args.expectedIndex) await ctx.db.patch(run._id, { status: "failed", failureCode: ["FORBIDDEN", "NOT_FOUND", "INVALID_STATE", "CAPACITY_EXCEEDED", "CONFLICT"].includes(args.code) ? args.code : "UNAVAILABLE" });
    return null;
  },
});
export const processQueued = internalAction({
  args: { runId: v.id("inventoryAnalysisRuns"), expectedIndex: v.number() }, returns: v.null(),
  handler: async (ctx, args): Promise<null> => {
    try { await ctx.runMutation(internal.inventoryIntelligence.processQueuedStep, args); }
    catch (error) {
      const message = error instanceof Error ? error.message : "";
      const code = ["FORBIDDEN", "NOT_FOUND", "INVALID_STATE", "CAPACITY_EXCEEDED", "CONFLICT"].find(value => message.includes(`${value}:`)) ?? "UNAVAILABLE";
      await ctx.runMutation(internal.inventoryIntelligence.markQueuedFailure, { ...args, code });
    }
    return null;
  },
});
export const queuedStatus = query({
  args: { businessId: v.id("businesses"), expectedUserId: v.string(), runId: v.id("inventoryAnalysisRuns") },
  returns: v.object({ jobId: v.id("inventoryAnalysisRuns"), status: v.string(), processedCount: v.number(), totalCount: v.number(), pricingGenerated: v.number(), forecastsGenerated: v.number(), failureCode: v.union(v.string(), v.null()) }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    const run = await ctx.db.get(args.runId);
    if (!run || run.businessId !== auth.businessId || run.actorId !== auth.userId) throw new Error("NOT_FOUND: Job unavailable");
    const options = normalizeOptions(run.optionsJson ? JSON.parse(run.optionsJson) : undefined);
    if (options.analysisType !== "pricing") requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    if (options.analysisType !== "inventory") requirePermission(auth.userRecord, "MANAGE_PRICING");
    return { jobId: run._id, status: run.status ?? "unqueued", processedCount: run.nextIndex ?? 0, totalCount: run.productIds.length, pricingGenerated: run.pricingGenerated ?? 0, forecastsGenerated: run.forecastsGenerated ?? 0, failureCode: run.failureCode ?? null };
  },
});
