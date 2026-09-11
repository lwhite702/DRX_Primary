import { v } from "convex/values";
import { query, internalQuery, internalMutation } from "./_generated/server";
import { requireSelectedBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { readSalesVelocity } from "./helpers/salesVelocity";

function nonnegative(value: number): number {
  if (!Number.isFinite(value) || value < 0 || value > Number.MAX_SAFE_INTEGER) {
    throw new Error("INVALID_STATE: Inventory health numeric value is out of range");
  }
  return value;
}

/** Read-only catalog valuation and reorder signals; valuation is not FIFO cost. */
export const snapshot = query({
  args: { businessId: v.id("businesses"), expectedUserId: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    const products = await ctx.db.query("products")
      .withIndex("by_businessId_and_isActive", q => q.eq("businessId", auth.businessId).eq("isActive", true))
      .take(1001);
    if (products.length > 1000) throw new Error("CAPACITY_EXCEEDED: Inventory health product limit exceeded");

    const now = Date.now();
    let remainingLines = 4096;
    let totalValueCents = 0;
    let outOfStockCount = 0;
    const lowStockItems = [];
    const reorderPredictions = [];
    for (const product of products) {
      const quantity = nonnegative(product.quantityOnHandGrams);
      const reorderLevel = nonnegative(product.reorderLevelGrams);
      if (!Number.isSafeInteger(product.unitCostCents) || product.unitCostCents < 0) {
        throw new Error("INVALID_STATE: Inventory unit cost must be nonnegative integer cents");
      }
      // Retain fractional quantities and sub-cent valuation; do not round each row.
      const itemValueCents = nonnegative(quantity * product.unitCostCents);
      if (itemValueCents > Number.MAX_SAFE_INTEGER - totalValueCents) {
        throw new Error("INVALID_STATE: Aggregate inventory valuation overflow");
      }
      totalValueCents = nonnegative(totalValueCents + itemValueCents);
      if (quantity === 0) outOfStockCount++;
      if (quantity <= reorderLevel) lowStockItems.push({
        id: product._id, product_name: product.productName,
        quantity_on_hand: quantity, reorder_level: reorderLevel,
      });
      const demand = await readSalesVelocity(ctx, auth.businessId, product._id, now, remainingLines);
      remainingLines -= demand.linesRead;
      const demand30Days = nonnegative(demand.units[1]);
      const dailyDemand = nonnegative(demand.velocity.velocity30d);
      const daysUntilStockout = dailyDemand > 0 ? quantity / dailyDemand : null;
      if (daysUntilStockout !== null && !Number.isFinite(daysUntilStockout)) {
        throw new Error("INVALID_STATE: Stockout forecast overflow");
      }
      const shouldReorder = quantity <= reorderLevel || (daysUntilStockout !== null && daysUntilStockout < 7);
      if (shouldReorder) reorderPredictions.push({
        inventory_id: product._id, product_name: product.productName,
        current_stock: quantity, reorder_level: reorderLevel,
        estimated_days_until_stockout: daysUntilStockout, should_reorder: true,
        recommended_quantity: nonnegative(Math.max(reorderLevel * 2, demand30Days)),
      });
    }
    return JSON.stringify({
      success: true,
      metrics: {
        total_items: products.length, low_stock_count: lowStockItems.length,
        out_of_stock_count: outOfStockCount, total_inventory_value: totalValueCents / 100,
      },
      low_stock_items: lowStockItems, reorder_predictions: reorderPredictions, ai_insight: null,
    });
  },
});


const reportScope = { businessId: v.id("businesses"), expectedUserId: v.string(), requestId: v.string() };
function validateRequestId(requestId: string) {
  if (!requestId.trim() || requestId.length > 200) throw new Error("INVALID_ARGUMENT: Invalid report request identifier");
}
export const reportReceipt = internalQuery({
  args: reportScope,
  returns: v.union(v.string(), v.null()),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    validateRequestId(args.requestId);
    const receipt = await ctx.db.query("inventoryHealthReports")
      .withIndex("by_businessId_and_actorId_and_requestId", q => q.eq("businessId", auth.businessId).eq("actorId", auth.userId).eq("requestId", args.requestId)).unique();
    return receipt?.resultJson ?? null;
  },
});

/** Only the provider action can save generated content; authorization is checked again after I/O. */
export const saveReport = internalMutation({
  args: { ...reportScope, resultJson: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    validateRequestId(args.requestId);
    if (new TextEncoder().encode(args.resultJson).length > 524288) throw new Error("CAPACITY_EXCEEDED: Health report exceeds storage limit");
    const existing = await ctx.db.query("inventoryHealthReports")
      .withIndex("by_businessId_and_actorId_and_requestId", q => q.eq("businessId", auth.businessId).eq("actorId", auth.userId).eq("requestId", args.requestId)).unique();
    if (existing) return existing.resultJson;
    const report = JSON.parse(args.resultJson);
    if (!["generated", "unconfigured", "failed"].includes(report.ai_status)) throw new Error("INVALID_STATE: Invalid health report status");
    const reportId = await ctx.db.insert("inventoryHealthReports", {
      businessId: auth.businessId, actorId: auth.userId, requestId: args.requestId, resultJson: args.resultJson, createdAt: Date.now(),
    });
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId, userId: auth.userId, action: "inventory_health_report", entityType: "inventory_health_report", entityId: reportId,
      metadata: JSON.stringify({ aiStatus: report.ai_status }), timestamp: Date.now(),
    });
    return args.resultJson;
  },
});
