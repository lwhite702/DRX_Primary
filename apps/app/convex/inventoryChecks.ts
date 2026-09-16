import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import type { FunctionReturnType } from "convex/server";
import { api } from "./_generated/api";
import { requireSelectedBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { settingsData } from "./helpers/businessPreferences";
import { normalizeProductCommerceConfig } from "./helpers/productCommerce";
import { recordShrinkage } from "./shrinkage";
import type { Doc } from "./_generated/dataModel";
function receipt(check: Doc<"inventoryChecks">) {
  return { success: true as const, check_id: check._id, expected_weight_grams: check.expectedWeightGrams, measured_weight_grams: check.measuredWeightGrams, delta_grams: check.deltaGrams, delta_percentage: check.deltaPercentage, discrepancy_flagged: check.discrepancyFlagged, shrinkage_id: check.shrinkageId ?? null };
}
export const record = mutation({
  args: { businessId: v.string(), expectedUserId: v.string(), productId: v.id("products"), requestId: v.string(), expectedWeightGrams: v.number(), measuredWeightGrams: v.number() },
  returns: v.object({ success: v.literal(true), check_id: v.id("inventoryChecks"), expected_weight_grams: v.number(), measured_weight_grams: v.number(), delta_grams: v.number(), delta_percentage: v.union(v.number(), v.null()), discrepancy_flagged: v.boolean(), shrinkage_id: v.union(v.id("shrinkageEvents"), v.null()) }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId); requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    if (!args.requestId.trim() || args.requestId.length > 160 || !Number.isFinite(args.measuredWeightGrams) || args.measuredWeightGrams < 0 || !Number.isFinite(args.expectedWeightGrams) || args.expectedWeightGrams < 0) throw new Error("INVALID_ARGUMENT: Invalid inventory check");
    const previous = await ctx.db.query("inventoryChecks").withIndex("by_businessId_and_requestId", q => q.eq("businessId", auth.businessId).eq("requestId", args.requestId)).unique();
    if (previous) {
      if (previous.userId !== auth.userId || previous.productId !== args.productId || previous.expectedWeightGrams !== args.expectedWeightGrams || previous.measuredWeightGrams !== args.measuredWeightGrams) throw new Error("CONFLICT: Inventory check retry differs");
      return receipt(previous);
    }
    const product = await ctx.db.get(args.productId);
    if (!product || product.businessId !== auth.businessId || !product.isActive) throw new Error("NOT_FOUND: Product unavailable");
    if (product.quantityOnHandGrams !== args.expectedWeightGrams) throw new Error("STALE_STOCK: Stock changed; reload before checking");
    const precision = normalizeProductCommerceConfig(product).quantityPrecision;
    if (!Number.isSafeInteger(precision) || precision < 0 || precision > 6) throw new Error("INVALID_STATE: Product precision requires reconciliation");
    const scale = 10 ** precision;
    for (const value of [args.expectedWeightGrams, args.measuredWeightGrams]) {
      const units = value * scale;
      if (!Number.isSafeInteger(Math.round(units)) || Math.abs(units - Math.round(units)) > 1e-6 || (value > 0 && Math.round(units) === 0) || (!product.allowFractionalWeight && !Number.isInteger(value))) throw new Error("INVALID_ARGUMENT: Measurement must fit product precision");
    }
    const settings = await ctx.db.query("businessSettings").withIndex("by_businessId", q => q.eq("businessId", auth.businessId)).unique();
    // Preserve the established 5% default; explicit malformed settings must be reconciled.
    const tolerance = settingsData(settings).random_check_tolerance_percentage ?? 5;
    if (typeof tolerance !== "number" || !Number.isFinite(tolerance) || tolerance < 0 || tolerance > 100) throw new Error("INVALID_STATE: Inventory check tolerance requires reconciliation");
    const delta = Math.abs(Math.round(args.measuredWeightGrams * scale) - Math.round(args.expectedWeightGrams * scale)) / scale;
    const percentage = args.expectedWeightGrams > 0 ? delta / args.expectedWeightGrams * 100 : delta === 0 ? 0 : null;
    if (percentage !== null && !Number.isFinite(percentage)) throw new Error("INVALID_STATE: Inventory check variance is out of range");
    const flagged = percentage === null || percentage > tolerance;
    let shrinkageId;
    if (flagged && args.measuredWeightGrams < args.expectedWeightGrams) {
      const loss = await recordShrinkage(ctx, { businessId: auth.businessId, expectedUserId: auth.userId, productId: product._id, requestId: `inventory-check:${args.requestId}`, quantityGrams: delta, shrinkageType: "inventory_variance" });
      shrinkageId = loss.shrinkage_id;
    }
    const now = Date.now();
    const checkId = await ctx.db.insert("inventoryChecks", { businessId: auth.businessId, userId: auth.userId, productId: product._id, requestId: args.requestId, expectedWeightGrams: args.expectedWeightGrams, measuredWeightGrams: args.measuredWeightGrams, deltaGrams: delta, deltaPercentage: percentage, discrepancyFlagged: flagged, tolerancePercentage: tolerance, shrinkageId, createdAt: now });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "INVENTORY_CHECK_RECORDED", entityType: "inventory_check", entityId: checkId, metadata: JSON.stringify({ productId: product._id, discrepancyFlagged: flagged, deltaGrams: delta }), timestamp: now });
    return receipt((await ctx.db.get(checkId))!);
  },
});

const candidate = v.object({ inventory_id: v.id("products"), product_name: v.string(), expected_weight_grams: v.number() });
export const candidates = query({
  args: { businessId: v.string(), expectedUserId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(candidate), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId); requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    if (!Number.isInteger(args.paginationOpts.numItems) || args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 200) throw new Error("INVALID_ARGUMENT: Invalid inventory check page");
    const result = await ctx.db.query("products").withIndex("by_businessId_and_isActive", q => q.eq("businessId", auth.businessId).eq("isActive", true)).paginate(args.paginationOpts);
    return { isDone: result.isDone, continueCursor: result.continueCursor, page: result.page.filter(p => normalizeProductCommerceConfig(p).sellingUnit === "g" && p.quantityOnHandGrams > 0).map(p => {
      if (!Number.isFinite(p.quantityOnHandGrams)) throw new Error("INVALID_STATE: Product stock requires reconciliation");
      return { inventory_id: p._id, product_name: p.productName, expected_weight_grams: p.quantityOnHandGrams };
    }) };
  },
});
export const selectRandom = action({
  args: { businessId: v.string(), expectedUserId: v.string() },
  returns: v.union(candidate, v.null()),
  handler: async (ctx, args): Promise<{ inventory_id: Doc<"products">["_id"]; product_name: string; expected_weight_grams: number } | null> => {
    let selected: { inventory_id: Doc<"products">["_id"]; product_name: string; expected_weight_grams: number } | null = null;
    let cursor: string | null = null, seen = 0;
    const cursors = new Set<string>();
    for (;;) {
      const result: FunctionReturnType<typeof api.inventoryChecks.candidates> = await ctx.runQuery(api.inventoryChecks.candidates, { ...args, paginationOpts: { numItems: 200, cursor } });
      for (const product of result.page) { seen++; if (Math.random() < 1 / seen) selected = product; }
      if (result.isDone) return selected;
      if (!result.continueCursor || cursors.has(result.continueCursor)) throw new Error("INVALID_STATE: Inventory page could not be confirmed");
      cursors.add(result.continueCursor); cursor = result.continueCursor;
    }
  },
});
