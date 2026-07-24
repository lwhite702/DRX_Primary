import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";

export const recordIntake = mutation({
  args: {
    productId: v.id("products"),
    totalCostCents: v.number(),
    totalWeightGrams: v.number(),
    supplier: v.optional(v.string()),
    deliveryCostCents: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    const now = Date.now();

    const product = await ctx.db.get(args.productId);
    if (!product || product.businessId !== auth.businessId) {
      throw new Error("NOT_FOUND: Product not found or unauthorized");
    }

    if (args.totalWeightGrams <= 0) {
      throw new Error("INVALID_ARGUMENT: Intake weight must be greater than zero");
    }

    const calculatedCostPerGramCents = args.totalCostCents / args.totalWeightGrams;

    // 1. Create Inventory Intake record
    const intakeId = await ctx.db.insert("inventoryIntakes", {
      businessId: auth.businessId,
      productId: args.productId,
      totalCostCents: args.totalCostCents,
      totalWeightGrams: args.totalWeightGrams,
      calculatedCostPerGramCents,
      deliveryCostCents: args.deliveryCostCents || 0,
      supplier: args.supplier,
      status: "approved",
      createdBy: auth.userId,
      createdAt: now,
    });

    // 2. Create FIFO Inventory Batch
    const batchId = await ctx.db.insert("inventoryBatches", {
      businessId: auth.businessId,
      productId: args.productId,
      intakeId,
      originalQuantityGrams: args.totalWeightGrams,
      remainingQuantityGrams: args.totalWeightGrams,
      unitCostPerGramCents: calculatedCostPerGramCents,
      supplier: args.supplier,
      receivedAt: now,
      createdBy: auth.userId,
      createdAt: now,
      updatedAt: now,
    });

    // 3. Update Product Quantity On Hand
    const newStock = product.quantityOnHandGrams + args.totalWeightGrams;
    await ctx.db.patch(args.productId, {
      quantityOnHandGrams: newStock,
      unitCostCents: Math.round(calculatedCostPerGramCents),
      updatedAt: now,
    });

    // 4. Record Audit Event
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "INVENTORY_INTAKE_RECORDED",
      entityType: "inventoryIntake",
      entityId: intakeId,
      metadata: JSON.stringify({
        productId: args.productId,
        weightGrams: args.totalWeightGrams,
        totalCostCents: args.totalCostCents,
        batchId,
      }),
      timestamp: now,
    });

    return { intakeId, batchId, newStock };
  },
});

export const getProductBatches = query({
  args: {
    productId: v.id("products"),
  },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    const batches = await ctx.db
      .query("inventoryBatches")
      .withIndex("by_productId_and_receivedAt", (q) =>
        q.eq("productId", args.productId)
      )
      .collect();

    return batches.filter((b) => b.businessId === auth.businessId);
  },
});
