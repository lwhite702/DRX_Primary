import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";

export const resolveCart = query({
  args: { businessId: v.string(), productIds: v.array(v.string()), customerId: v.optional(v.string()) },
  returns: v.object({ productIds: v.array(v.id("products")), customerId: v.optional(v.id("customers")) }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
    if (args.businessId !== auth.businessId && args.businessId !== auth.businessRecord.legacyPrismaBusinessId) throw new Error("FORBIDDEN: Selected business does not match membership");
    if (args.productIds.length > 200) throw new Error("INVALID_ARGUMENT: Cart has too many products");
    const productIds = await Promise.all(args.productIds.map(async value => {
      const id = ctx.db.normalizeId("products", value);
      const product = id ? await ctx.db.get(id) : await ctx.db.query("products")
        .withIndex("by_businessId_and_legacyPrismaId", q => q.eq("businessId", auth.businessId).eq("legacyPrismaId", value)).unique();
      if (!product || product.businessId !== auth.businessId || !product.isActive) throw new Error("NOT_FOUND: Cart product is unavailable");
      return product._id;
    }));
    let customerId;
    if (args.customerId) {
      const id = ctx.db.normalizeId("customers", args.customerId);
      const customer = id ? await ctx.db.get(id) : await ctx.db.query("customers")
        .withIndex("by_businessId_and_legacyPrismaId", q => q.eq("businessId", auth.businessId).eq("legacyPrismaId", args.customerId!)).unique();
      if (!customer || customer.businessId !== auth.businessId || !customer.isActive) throw new Error("NOT_FOUND: Customer is unavailable");
      customerId = customer._id;
    }
    return { productIds, customerId };
  },
});
