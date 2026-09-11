import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import type { MutationCtx } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { normalizeProductCommerceConfig } from "./helpers/productCommerce";

async function stockAuth(ctx: MutationCtx, businessId: string) {
  const auth = await requireUserAndBusiness(ctx);
  requirePermission(auth.userRecord, "MANAGE_INVENTORY");
  if (businessId !== auth.businessId && businessId !== auth.businessRecord.legacyPrismaBusinessId) throw new Error("FORBIDDEN: Selected business does not match membership");
  return auth;
}

async function setStock(ctx: MutationCtx, product: Doc<"products">, quantity: number, actor: string) {
  const precision = normalizeProductCommerceConfig(product).quantityPrecision;
  const scaled = quantity * 10 ** precision;
  if (!Number.isFinite(quantity) || quantity < 0 || !Number.isSafeInteger(Math.round(scaled)) ||
      Math.abs(scaled - Math.round(scaled)) > 1e-6 || (!product.allowFractionalWeight && !Number.isInteger(quantity))) {
    throw new Error("INVALID_ARGUMENT: Stock must fit the product quantity precision and cannot be negative");
  }
  const delta = quantity - product.quantityOnHandGrams;
  const now = Date.now();
  if (delta > 0) {
    await ctx.db.insert("inventoryBatches", { businessId: product.businessId, productId: product._id,
      originalQuantityGrams: delta, remainingQuantityGrams: delta, unitCostPerGramCents: product.unitCostCents,
      receivedAt: now, createdBy: actor, createdAt: now, updatedAt: now });
  } else if (delta < 0) {
    // Indexed traversal is bounded; a large unresolved history fails atomically
    // rather than changing the product count without its corresponding batches.
    const batches = await ctx.db.query("inventoryBatches")
      .withIndex("by_productId_and_receivedAt", q => q.eq("productId", product._id)).take(4097);
    let remaining = -delta;
    for (const batch of batches.slice(0, 4096)) {
      if (batch.businessId !== product.businessId) throw new Error("INVALID_STATE: Batch tenant mismatch");
      if (batch.remainingQuantityGrams <= 0) continue;
      const consumed = Math.min(remaining, batch.remainingQuantityGrams);
      await ctx.db.patch(batch._id, { remainingQuantityGrams: batch.remainingQuantityGrams - consumed, updatedAt: now });
      remaining -= consumed;
      if (remaining < 1e-9) break;
    }
    if (remaining > 1e-9) throw new Error("INVALID_STATE: Stock batches require reconciliation before this adjustment");
  }
  await ctx.db.patch(product._id, { quantityOnHandGrams: quantity, updatedAt: now });
  return delta;
}

export const adjustStock = mutation({
  args: { businessId: v.string(), productId: v.id("products"), type: v.union(v.literal("set"), v.literal("delta")),
    value: v.number(), reason: v.string(), idempotencyKey: v.string() },
  returns: v.object({ success: v.boolean(), new_quantity: v.number(), delta: v.number(), replayed: v.boolean() }),
  handler: async (ctx, args) => {
    const auth = await stockAuth(ctx, args.businessId);
    if (!args.reason.trim() || args.reason.length > 500 || !args.idempotencyKey.trim() || args.idempotencyKey.length > 200) throw new Error("INVALID_ARGUMENT: Reason and request key are required");
    const product = await ctx.db.get(args.productId);
    if (!product || product.businessId !== auth.businessId || !product.isActive) throw new Error("NOT_FOUND: Product unavailable");
    const key = `stock-adjustment:${args.idempotencyKey}`;
    const fingerprint = JSON.stringify([args.productId, args.type, args.value, args.reason.trim()]);
    const previous = await ctx.db.query("idempotencyKeys").withIndex("by_businessId_and_key", q => q.eq("businessId", auth.businessId).eq("key", key)).unique();
    if (previous) {
      const saved = JSON.parse(previous.resultJson) as { fingerprint: string; quantity: number; delta: number };
      if (previous.action !== "stock_adjustment" || saved.fingerprint !== fingerprint) throw new Error("CONFLICT: Request key already used");
      return { success: true, new_quantity: saved.quantity, delta: saved.delta, replayed: true };
    }
    const quantity = args.type === "set" ? args.value : product.quantityOnHandGrams + args.value;
    const delta = await setStock(ctx, product, quantity, auth.userId);
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "INVENTORY_ADJUSTED",
      entityType: "product", entityId: product._id, metadata: JSON.stringify({ delta, reason: args.reason.trim(), previousQuantity: product.quantityOnHandGrams, quantity }), timestamp: Date.now() });
    await ctx.db.insert("idempotencyKeys", { businessId: auth.businessId, key, action: "stock_adjustment",
      resultJson: JSON.stringify({ fingerprint, quantity, delta }), createdAt: Date.now() });
    return { success: true, new_quantity: quantity, delta, replayed: false };
  },
});

export const updateProduct = mutation({
  args: { businessId: v.string(), productId: v.id("products"), productName: v.optional(v.string()), sku: v.optional(v.string()),
    description: v.optional(v.string()), category: v.optional(v.string()), sellingUnit: v.optional(v.string()),
    quantity: v.optional(v.number()), reorderLevel: v.optional(v.number()), unitCostCents: v.optional(v.number()), sellingPriceCents: v.optional(v.number()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const auth = await stockAuth(ctx, args.businessId);
    const product = await ctx.db.get(args.productId);
    if (!product || product.businessId !== auth.businessId || !product.isActive) throw new Error("NOT_FOUND: Product unavailable");
    for (const cents of [args.unitCostCents, args.sellingPriceCents]) {
      if (cents !== undefined && (!Number.isSafeInteger(cents) || cents < 0)) throw new Error("INVALID_ARGUMENT: Invalid price");
    }
    if (args.reorderLevel !== undefined && (!Number.isFinite(args.reorderLevel) || args.reorderLevel < 0)) throw new Error("INVALID_ARGUMENT: Invalid reorder level");
    for (const text of [args.productName, args.sku, args.sellingUnit]) {
      if (text !== undefined && (!text.trim() || text.length > 300)) throw new Error("INVALID_ARGUMENT: Invalid product details");
    }
    if (args.sellingUnit !== undefined && args.sellingUnit !== normalizeProductCommerceConfig(product).sellingUnit && product.quantityOnHandGrams !== 0) throw new Error("CONFLICT: Reconcile stock before changing its unit");
    if (args.sku !== undefined) {
      const duplicate = await ctx.db.query("products").withIndex("by_businessId_and_sku", q => q.eq("businessId", auth.businessId).eq("sku", args.sku!.trim())).unique();
      if (duplicate && duplicate._id !== product._id) throw new Error("ALREADY_EXISTS: SKU exists");
    }
    const delta = args.quantity === undefined ? 0 : await setStock(ctx, { ...product, unitCostCents: args.unitCostCents ?? product.unitCostCents }, args.quantity, auth.userId);
    const patch: Partial<Doc<"products">> = { updatedAt: Date.now() };
    if (args.productName !== undefined) patch.productName = args.productName.trim();
    if (args.sku !== undefined) patch.sku = args.sku.trim();
    if (args.description !== undefined) patch.description = args.description;
    if (args.category !== undefined) patch.category = args.category;
    if (args.sellingUnit !== undefined) patch.sellingUnit = args.sellingUnit.trim();
    if (args.reorderLevel !== undefined) patch.reorderLevelGrams = args.reorderLevel;
    if (args.unitCostCents !== undefined) patch.unitCostCents = args.unitCostCents;
    if (args.sellingPriceCents !== undefined) patch.sellingPriceCents = args.sellingPriceCents;
    await ctx.db.patch(product._id, patch);
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "PRODUCT_UPDATED", entityType: "product", entityId: product._id,
      metadata: JSON.stringify({ delta, reason: "Product details updated", fields: Object.keys(patch), previousQuantity: product.quantityOnHandGrams, quantity: args.quantity ?? product.quantityOnHandGrams }), timestamp: Date.now() });
    return null;
  },
});

export const recentAudit = query({
  args: { businessId: v.string() },
  returns: v.array(v.object({ id: v.string(), created_at: v.string(), transaction_type: v.string(), quantity_change: v.number(),
    reason: v.string(), product_name: v.string(), sku: v.string(), created_by_email: v.string() })),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_AUDIT_LOGS");
    if (args.businessId !== auth.businessId && args.businessId !== auth.businessRecord.legacyPrismaBusinessId) throw new Error("FORBIDDEN: Selected business does not match membership");
    const groups = await Promise.all(["product", "inventoryIntake"].map(entityType => ctx.db.query("auditEvents")
      .withIndex("by_businessId_and_entityType_and_timestamp", q => q.eq("businessId", auth.businessId).eq("entityType", entityType))
      .order("desc").take(100)));
    const events = groups.flat().sort((a, b) => b.timestamp - a.timestamp).slice(0, 100);
    return Promise.all(events.map(async event => {
      let metadata: Record<string, unknown> = {};
      try { metadata = JSON.parse(event.metadata); } catch { /* Older audit records may lack structured details. */ }
      const rawId = event.entityType === "product" ? event.entityId : metadata?.productId;
      const productId = typeof rawId === "string" ? ctx.db.normalizeId("products", rawId) : null;
      const product = productId ? await ctx.db.get(productId) : null;
      const ownedProduct = product?.businessId === auth.businessId ? product : null;
      const actor = await ctx.db.query("users").withIndex("by_clerkUserId_and_businessId", q => q.eq("clerkUserId", event.userId).eq("businessId", auth.businessId)).unique();
      const actorLabel = actor?.businessId === auth.businessId ? (actor.name || actor.email) : event.userId;
      const change = event.action === "INVENTORY_INTAKE_RECORDED" ? metadata?.weightGrams : metadata?.delta;
      return { id: event._id, created_at: new Date(event.timestamp).toISOString(), transaction_type: event.action,
        quantity_change: typeof change === "number" && Number.isFinite(change) ? change : 0,
        reason: typeof metadata?.reason === "string" ? metadata.reason : event.action.replaceAll("_", " ").toLowerCase(),
        product_name: ownedProduct?.productName ?? "Product unavailable", sku: ownedProduct?.sku ?? "",
        created_by_email: actorLabel };
    }));
  },
});
