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

// Web cutover keeps the existing native recordIntake contract intact.
// All new web submissions and decisions use the canonical transaction below.
import { paginationOptsValidator } from "convex/server";
import type { MutationCtx, QueryCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";

const intakeStatus = v.union(v.literal("pending"), v.literal("approved"), v.literal("rejected"));
const resultValidator = v.object({
  intakeId: v.id("inventoryIntakes"), requiresApproval: v.boolean(),
  status: v.string(), newStock: v.number(), replayed: v.boolean(),
});

async function intakeAuth(ctx: QueryCtx | MutationCtx, selectedBusiness: string) {
  const auth = await requireUserAndBusiness(ctx);
  requirePermission(auth.userRecord, "MANAGE_INVENTORY");
  if (selectedBusiness !== auth.businessId && selectedBusiness !== auth.businessRecord.legacyPrismaBusinessId) {
    throw new Error("FORBIDDEN: Selected business does not match the authenticated workspace");
  }
  return auth;
}

function validateValues(values: { totalCostCents: number; totalWeightGrams: number; deliveryCostCents?: number; supplier?: string }) {
  if (!Number.isSafeInteger(values.totalCostCents) || values.totalCostCents <= 0 ||
      !Number.isSafeInteger(values.deliveryCostCents ?? 0) || (values.deliveryCostCents ?? 0) < 0 ||
      !Number.isFinite(values.totalWeightGrams) || values.totalWeightGrams < 0.01 || values.totalWeightGrams > Number.MAX_SAFE_INTEGER ||
      !Number.isSafeInteger(Math.round(values.totalCostCents / values.totalWeightGrams)) ||
      (values.supplier?.length ?? 0) > 300) {
    throw new Error("INVALID_ARGUMENT: Check intake cost, quantity and delivery cost");
  }
}

async function applyCanonicalIntake(ctx: MutationCtx, row: Doc<"inventoryIntakes">, actor: string) {
  const product = await ctx.db.get(row.productId);
  if (!product || product.businessId !== row.businessId || !product.isActive) throw new Error("NOT_FOUND: Product unavailable");
  const newStock = product.quantityOnHandGrams + row.totalWeightGrams;
  if (!Number.isFinite(newStock) || newStock > Number.MAX_SAFE_INTEGER) throw new Error("INVALID_ARGUMENT: Stock exceeds supported quantity");
  const now = Date.now();
  const batchId = await ctx.db.insert("inventoryBatches", {
    businessId: row.businessId, productId: row.productId, intakeId: row._id,
    originalQuantityGrams: row.totalWeightGrams, remainingQuantityGrams: row.totalWeightGrams,
    unitCostPerGramCents: row.calculatedCostPerGramCents, supplier: row.supplier,
    receivedAt: now, createdBy: actor, createdAt: now, updatedAt: now,
  });
  await ctx.db.patch(product._id, { quantityOnHandGrams: newStock,
    unitCostCents: Math.round(row.calculatedCostPerGramCents), updatedAt: now });
  await ctx.db.patch(row._id, { status: "approved", approvedBy: actor, approvedAt: now, batchId });
  await ctx.db.insert("auditEvents", {
    businessId: row.businessId, userId: actor, action: "INVENTORY_INTAKE_RECORDED",
    entityType: "inventoryIntake", entityId: row._id,
    metadata: JSON.stringify({ productId: product._id, batchId, weightGrams: row.totalWeightGrams, totalCostCents: row.totalCostCents }), timestamp: now,
  });
  return newStock;
}

export const submitIntake = mutation({
  args: { businessId: v.string(), productId: v.id("products"), idempotencyKey: v.string(),
    totalCostCents: v.number(), totalWeightGrams: v.number(), deliveryCostCents: v.optional(v.number()), supplier: v.optional(v.string()) },
  returns: resultValidator,
  handler: async (ctx, args) => {
    const auth = await intakeAuth(ctx, args.businessId);
    validateValues(args);
    if (!args.idempotencyKey.trim() || args.idempotencyKey.length > 200) throw new Error("INVALID_ARGUMENT: A request key is required");
    const product = await ctx.db.get(args.productId);
    if (!product || product.businessId !== auth.businessId || !product.isActive) throw new Error("NOT_FOUND: Product unavailable");
    const values = { productId: args.productId, totalCostCents: args.totalCostCents, totalWeightGrams: args.totalWeightGrams,
      deliveryCostCents: args.deliveryCostCents ?? 0, supplier: args.supplier?.trim() || "" };
    const fingerprint = JSON.stringify(values);
    const key = `inventory-intake:${args.idempotencyKey}`;
    const existing = await ctx.db.query("idempotencyKeys").withIndex("by_businessId_and_key", q => q.eq("businessId", auth.businessId).eq("key", key)).unique();
    if (existing) {
      const saved = JSON.parse(existing.resultJson) as { fingerprint: string; intakeId: Id<"inventoryIntakes"> };
      if (existing.action !== "inventory_intake" || saved.fingerprint !== fingerprint) throw new Error("CONFLICT: This request was already submitted with different values");
      const row = await ctx.db.get(saved.intakeId);
      if (!row || row.businessId !== auth.businessId) throw new Error("CONFLICT: Prior intake requires review");
      return { intakeId: row._id, requiresApproval: row.status === "pending", status: row.status, newStock: product.quantityOnHandGrams, replayed: true };
    }
    const recent = await ctx.db.query("inventoryIntakes")
      .withIndex("by_businessId_and_productId_and_status_and_createdAt", q => q.eq("businessId", auth.businessId).eq("productId", product._id).eq("status", "approved").gte("createdAt", Date.now() - 90 * 86400000))
      .take(4097);
    const average = recent.length ? recent.reduce((sum, row) => sum + row.calculatedCostPerGramCents, 0) / recent.length : 0;
    const unitCost = args.totalCostCents / args.totalWeightGrams;
    // Overflow goes to review rather than silently using a truncated average.
    const requiresApproval = recent.length > 4096 || (average > 0 && Math.abs((unitCost - average) / average) > 0.5);
    const intakeId = await ctx.db.insert("inventoryIntakes", {
      businessId: auth.businessId, productId: product._id, totalCostCents: values.totalCostCents,
      totalWeightGrams: values.totalWeightGrams, calculatedCostPerGramCents: unitCost,
      deliveryCostCents: values.deliveryCostCents, supplier: values.supplier || undefined,
      status: "pending", requiresApproval, createdBy: auth.userId, createdAt: Date.now(),
    });
    const row = (await ctx.db.get(intakeId))!;
    let newStock = product.quantityOnHandGrams;
    if (!requiresApproval) newStock = await applyCanonicalIntake(ctx, row, auth.userId);
    else await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId,
      action: "INVENTORY_INTAKE_SUBMITTED", entityType: "inventoryIntake", entityId: intakeId,
      metadata: JSON.stringify({ productId: product._id }), timestamp: Date.now() });
    await ctx.db.insert("idempotencyKeys", { businessId: auth.businessId, key, action: "inventory_intake",
      resultJson: JSON.stringify({ fingerprint, intakeId }), createdAt: Date.now() });
    return { intakeId, requiresApproval, status: requiresApproval ? "pending" : "approved", newStock, replayed: false };
  },
});

export const decideIntake = mutation({
  args: { businessId: v.string(), intakeId: v.id("inventoryIntakes"), action: v.union(v.literal("approve"), v.literal("reject")),
    rejectionReason: v.optional(v.string()), overrides: v.optional(v.object({ totalCostCents: v.optional(v.number()), totalWeightGrams: v.optional(v.number()), deliveryCostCents: v.optional(v.number()), supplier: v.optional(v.string()) })) },
  returns: v.object({ status: v.string(), replayed: v.boolean() }),
  handler: async (ctx, args) => {
    const auth = await intakeAuth(ctx, args.businessId);
    let row = await ctx.db.get(args.intakeId);
    if (!row || row.businessId !== auth.businessId) throw new Error("NOT_FOUND: Intake unavailable");
    const original = { totalCostCents: row.totalCostCents, totalWeightGrams: row.totalWeightGrams, deliveryCostCents: row.deliveryCostCents };
    const status = args.action === "approve" ? "approved" : "rejected";
    if (row.status === status) return { status, replayed: true };
    if (row.status !== "pending") throw new Error("CONFLICT: Intake already decided");
    if ((args.rejectionReason?.length ?? 0) > 500) throw new Error("INVALID_ARGUMENT: Rejection reason is too long");
    if (args.action === "reject") {
      await ctx.db.patch(row._id, { status, approvedBy: auth.userId, approvedAt: Date.now(), rejectionReason: args.rejectionReason?.trim() });
    } else {
      const values = { totalCostCents: args.overrides?.totalCostCents ?? row.totalCostCents,
        totalWeightGrams: args.overrides?.totalWeightGrams ?? row.totalWeightGrams,
        deliveryCostCents: args.overrides?.deliveryCostCents ?? row.deliveryCostCents,
        supplier: args.overrides?.supplier?.trim() ?? row.supplier };
      validateValues(values);
      await ctx.db.patch(row._id, { ...values, calculatedCostPerGramCents: values.totalCostCents / values.totalWeightGrams });
      row = (await ctx.db.get(row._id))!;
      await applyCanonicalIntake(ctx, row, auth.userId);
    }
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId,
      action: status === "approved" ? "INVENTORY_INTAKE_APPROVED" : "INVENTORY_INTAKE_REJECTED",
      entityType: "inventoryIntake", entityId: row._id,
      metadata: JSON.stringify({ edited: Boolean(args.overrides), original, decided: { totalCostCents: row.totalCostCents, totalWeightGrams: row.totalWeightGrams, deliveryCostCents: row.deliveryCostCents } }), timestamp: Date.now() });
    return { status, replayed: false };
  },
});

const intakeRow = v.object({ id: v.id("inventoryIntakes"), inventory_id: v.id("products"), product_name: v.string(), sku: v.string(),
  unit_of_measure: v.string(), total_cost: v.number(), total_weight_grams: v.number(), calculated_cost_per_gram: v.number(),
  delivery_cost: v.number(), supplier: v.string(), created_at: v.string(), created_by_email: v.string(), status: v.string() });
export const listIntakes = query({
  args: { businessId: v.string(), status: intakeStatus, paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(intakeRow), continueCursor: v.string(), isDone: v.boolean() }),
  handler: async (ctx, args) => {
    const auth = await intakeAuth(ctx, args.businessId);
    const result = await ctx.db.query("inventoryIntakes").withIndex("by_businessId_and_status", q => q.eq("businessId", auth.businessId).eq("status", args.status))
      .order("desc").paginate({ ...args.paginationOpts, numItems: Math.min(args.paginationOpts.numItems, 100) });
    const page = await Promise.all(result.page.map(async row => {
      const product = await ctx.db.get(row.productId);
      const owned = product?.businessId === auth.businessId ? product : null;
      return { id: row._id, inventory_id: row.productId, product_name: owned?.productName ?? "Unavailable product", sku: owned?.sku ?? "",
        unit_of_measure: owned?.sellingUnit ?? "g", total_cost: row.totalCostCents / 100, total_weight_grams: row.totalWeightGrams,
        calculated_cost_per_gram: row.calculatedCostPerGramCents / 100, delivery_cost: row.deliveryCostCents / 100,
        supplier: row.supplier ?? "", created_at: new Date(row.createdAt).toISOString(), created_by_email: "Business staff", status: row.status };
    }));
    return { page, continueCursor: result.continueCursor, isDone: result.isDone };
  },
});

export const listIntakeProducts = query({
  args: { businessId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(v.object({ id: v.id("products"), product_name: v.string(), sku: v.string(), quantity_on_hand: v.number(), unit_of_measure: v.string() })), continueCursor: v.string(), isDone: v.boolean() }),
  handler: async (ctx, args) => {
    const auth = await intakeAuth(ctx, args.businessId);
    const result = await ctx.db.query("products").withIndex("by_businessId_and_isActive", q => q.eq("businessId", auth.businessId).eq("isActive", true))
      .paginate({ ...args.paginationOpts, numItems: Math.min(args.paginationOpts.numItems, 100) });
    return { page: result.page.map(row => ({ id: row._id, product_name: row.productName, sku: row.sku, quantity_on_hand: row.quantityOnHandGrams, unit_of_measure: row.sellingUnit ?? "g" })),
      continueCursor: result.continueCursor, isDone: result.isDone };
  },
});
