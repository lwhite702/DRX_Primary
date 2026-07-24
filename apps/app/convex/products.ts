import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";

export const createProduct = mutation({
  args: {
    sku: v.string(),
    productName: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    sellingPriceCents: v.number(),
    unitCostCents: v.number(),
    reorderLevelGrams: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    const now = Date.now();

    // Check SKU uniqueness per business
    const existing = await ctx.db
      .query("products")
      .withIndex("by_businessId_and_sku", (q: any) =>
        q.eq("businessId", auth.businessId).eq("sku", args.sku)
      )
      .unique();

    if (existing) {
      throw new Error(`ALREADY_EXISTS: Product SKU '${args.sku}' already exists in catalog`);
    }

    const productId = await ctx.db.insert("products", {
      businessId: auth.businessId,
      sku: args.sku,
      productName: args.productName,
      description: args.description,
      category: args.category || "General",
      sellingPriceCents: args.sellingPriceCents,
      unitCostCents: args.unitCostCents,
      quantityOnHandGrams: 0,
      reorderLevelGrams: args.reorderLevelGrams || 10,
      allowFractionalWeight: true,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "PRODUCT_CREATED",
      entityType: "product",
      entityId: productId,
      metadata: JSON.stringify({ sku: args.sku, name: args.productName }),
      timestamp: now,
    });

    return productId;
  },
});

export const listProducts = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireUserAndBusiness(ctx);
    const products = await ctx.db
      .query("products")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return products;
  },
});
