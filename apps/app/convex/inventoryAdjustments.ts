import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";

const LOSS_TYPES = new Set(["shrinkage", "spill", "damage"]);

export const createStockAdjustment = mutation({
  args: {
    productId: v.id("products"),
    batchId: v.id("inventoryBatches"),
    adjustmentType: v.union(
      v.literal("shrinkage"),
      v.literal("spill"),
      v.literal("damage"),
      v.literal("recount"),
    ),
    direction: v.union(v.literal("increase"), v.literal("decrease")),
    quantityGrams: v.number(),
    notes: v.string(),
  },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_INVENTORY");

    if (!Number.isFinite(args.quantityGrams) || args.quantityGrams <= 0) {
      throw new Error(
        "INVALID_ARGUMENT: Adjustment quantity must be a positive finite number",
      );
    }
    if (!args.notes.trim()) {
      throw new Error("INVALID_ARGUMENT: Adjustment notes are required");
    }
    if (LOSS_TYPES.has(args.adjustmentType) && args.direction !== "decrease") {
      throw new Error(
        "INVALID_ARGUMENT: Loss adjustments can only decrease inventory",
      );
    }

    const [product, batch] = await Promise.all([
      ctx.db.get(args.productId),
      ctx.db.get(args.batchId),
    ]);
    if (!product || product.businessId !== auth.businessId) {
      throw new Error(`NOT_FOUND: Product '${args.productId}' not found`);
    }
    if (
      !batch ||
      batch.businessId !== auth.businessId ||
      batch.productId !== args.productId
    ) {
      throw new Error(
        "INVALID_ARGUMENT: Batch does not belong to the selected product and business",
      );
    }

    const delta =
      args.direction === "increase" ? args.quantityGrams : -args.quantityGrams;
    const nextBatchQuantity = batch.remainingQuantityGrams + delta;
    const nextProductQuantity = product.quantityOnHandGrams + delta;
    if (nextBatchQuantity < 0 || nextProductQuantity < 0) {
      throw new Error(
        "INSUFFICIENT_STOCK: Adjustment exceeds available inventory",
      );
    }
    if (nextBatchQuantity > batch.originalQuantityGrams) {
      throw new Error(
        "INVALID_ARGUMENT: Adjustment would exceed the batch's original quantity",
      );
    }

    const now = Date.now();
    const costLossCents =
      args.direction === "decrease" && LOSS_TYPES.has(args.adjustmentType)
        ? Math.round(args.quantityGrams * batch.unitCostPerGramCents)
        : 0;

    await ctx.db.patch(args.batchId, {
      remainingQuantityGrams: nextBatchQuantity,
      updatedAt: now,
    });
    await ctx.db.patch(args.productId, {
      quantityOnHandGrams: nextProductQuantity,
      updatedAt: now,
    });

    const adjustmentId = await ctx.db.insert("stockAdjustments", {
      businessId: auth.businessId,
      productId: args.productId,
      batchId: args.batchId,
      adjustmentType: args.adjustmentType,
      direction: args.direction,
      quantityGrams: args.quantityGrams,
      costLossCents,
      notes: args.notes.trim(),
      createdBy: auth.userId,
      createdAt: now,
    });

    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "INVENTORY_STOCK_ADJUSTED",
      entityType: "stockAdjustment",
      entityId: adjustmentId,
      metadata: JSON.stringify({
        productId: args.productId,
        batchId: args.batchId,
        adjustmentType: args.adjustmentType,
        direction: args.direction,
        quantityGrams: args.quantityGrams,
        costLossCents,
      }),
      timestamp: now,
    });

    return {
      adjustmentId,
      costLossCents,
      remainingBatchQuantityGrams: nextBatchQuantity,
      quantityOnHandGrams: nextProductQuantity,
    };
  },
});

export const listStockAdjustments = query({
  args: { productId: v.optional(v.id("products")) },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_FINANCIALS");

    const adjustments = await ctx.db
      .query("stockAdjustments")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .order("desc")
      .collect();

    return args.productId
      ? adjustments.filter(
          (adjustment) => adjustment.productId === args.productId,
        )
      : adjustments;
  },
});
