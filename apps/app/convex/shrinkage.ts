import type { MutationCtx } from "./_generated/server";
import type { Id } from "./_generated/dataModel";
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { requireSelectedBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { settingsData } from "./helpers/businessPreferences";
import { normalizeProductCommerceConfig } from "./helpers/productCommerce";
import { allocateFifoInventoryBatches } from "./helpers/fifo";
export const record = mutation({
  args: { businessId: v.string(), expectedUserId: v.string(), productId: v.id("products"), requestId: v.string(), quantityGrams: v.number(), shrinkageType: v.union(v.literal("personal_use"), v.literal("damaged"), v.literal("theft"), v.literal("expired"), v.literal("lost"), v.literal("store_use"), v.literal("sample"), v.literal("other"), v.literal("damage"), v.literal("spillage"), v.literal("inventory_variance")), note: v.optional(v.string()) },
  returns: v.object({ success: v.literal(true), shrinkage_id: v.id("shrinkageEvents"), new_inventory_grams: v.number(), costCents: v.number(), replayed: v.boolean() }),
  handler: (ctx, args) => {
    if (args.requestId.startsWith("inventory-check:")) throw new Error("INVALID_ARGUMENT: Reserved request namespace");
    return recordShrinkage(ctx, args);
  },
});

export async function recordShrinkage(ctx: MutationCtx, args: { businessId: string; expectedUserId: string; productId: Id<"products">; requestId: string; quantityGrams: number; shrinkageType: "personal_use" | "damaged" | "theft" | "expired" | "lost" | "store_use" | "sample" | "other" | "damage" | "spillage" | "inventory_variance"; note?: string }) {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId); requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    const note = args.note ?? "";
    if (!args.requestId.trim() || args.requestId.length > 200 || note.length > 500 || !Number.isFinite(args.quantityGrams) || args.quantityGrams <= 0) throw new Error("INVALID_ARGUMENT: Invalid shrinkage request");
    const previous = await ctx.db.query("shrinkageEvents").withIndex("by_businessId_and_requestId", q => q.eq("businessId", auth.businessId).eq("requestId", args.requestId)).unique();
    if (previous) {
      if (previous.userId !== auth.userId || previous.productId !== args.productId || previous.quantityGrams !== args.quantityGrams || previous.shrinkageType !== args.shrinkageType || previous.note !== note) throw new Error("CONFLICT: Shrinkage retry differs");
      return { success: true as const, shrinkage_id: previous._id, new_inventory_grams: previous.newQuantityGrams, costCents: previous.costCents, replayed: true };
    }
    const settings = await ctx.db.query("businessSettings").withIndex("by_businessId", q => q.eq("businessId", auth.businessId)).unique();
    const policy = settingsData(settings).require_supervisor_pin_for_shrinkage;
    if (typeof policy !== "boolean") throw new Error("INVALID_STATE: Shrinkage approval policy requires reconciliation");
    // Approval-specific verification is intentionally not inferred from a nonempty PIN.
    if (policy) throw new Error("APPROVAL_REQUIRED: Supervisor approval is required");
    const product = await ctx.db.get(args.productId);
    if (!product || product.businessId !== auth.businessId || !product.isActive) throw new Error("NOT_FOUND: Product unavailable");
    const precision = normalizeProductCommerceConfig(product).quantityPrecision;
    if (!Number.isSafeInteger(precision) || precision < 0 || precision > 6) throw new Error("INVALID_STATE: Product precision requires reconciliation");
    const scale = 10 ** precision;
    const requested = args.quantityGrams * scale, available = product.quantityOnHandGrams * scale;
    if (Math.round(requested) <= 0 || !Number.isSafeInteger(Math.round(requested)) || Math.abs(requested - Math.round(requested)) > 1e-6 || (!product.allowFractionalWeight && !Number.isInteger(args.quantityGrams))) throw new Error("INVALID_ARGUMENT: Shrinkage must fit product precision");
    if (!Number.isFinite(available) || !Number.isSafeInteger(Math.round(available)) || Math.abs(available - Math.round(available)) > 1e-6) throw new Error("INVALID_STATE: Product stock requires reconciliation");
    if (Math.round(requested) > Math.round(available)) throw new Error("INSUFFICIENT_STOCK: Shrinkage exceeds stock");
    const allocations = await allocateFifoInventoryBatches(ctx, auth.businessId, product._id, args.quantityGrams);
    const newQuantityGrams = (Math.round(available) - Math.round(requested)) / scale;
    const costCents = allocations.reduce((sum, allocation) => sum + allocation.extendedCostCents, 0), now = Date.now();
    await ctx.db.patch(product._id, { quantityOnHandGrams: newQuantityGrams, updatedAt: now });
    const shrinkage_id = await ctx.db.insert("shrinkageEvents", { businessId: auth.businessId, userId: auth.userId, productId: product._id, requestId: args.requestId, quantityGrams: args.quantityGrams, shrinkageType: args.shrinkageType, note, newQuantityGrams, costCents, allocations, createdAt: now });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "SHRINKAGE_RECORDED", entityType: "product", entityId: product._id, metadata: JSON.stringify({ shrinkageId: shrinkage_id, delta: -args.quantityGrams, quantity: newQuantityGrams, shrinkageType: args.shrinkageType, costCents }), timestamp: now });
    return { success: true as const, shrinkage_id, new_inventory_grams: newQuantityGrams, costCents, replayed: false };
}
