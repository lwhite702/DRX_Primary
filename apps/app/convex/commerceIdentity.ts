import { query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { normalizeProductCommerceConfig } from "./helpers/productCommerce";
import { validateSaleQuantity } from "./helpers/pricing";

/** Advisory snapshot only. Checkout rechecks stock and credit in its mutation. */
export const checkCart = query({
  args: {
    businessId: v.string(),
    items: v.array(v.object({ productId: v.string(), quantity: v.number() })),
    customerId: v.optional(v.string()),
    amountCents: v.number(),
  },
  returns: v.object({
    stock: v.object({ valid: v.boolean(), errors: v.array(v.object({ inventoryId: v.string(), message: v.string() })) }),
    credit: v.object({ valid: v.boolean(), currentBalance: v.number(), maxLimit: v.number(), remaining: v.union(v.number(), v.null()), unlimited: v.boolean(), warning: v.optional(v.string()) }),
  }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
    if (args.businessId !== auth.businessId && args.businessId !== auth.businessRecord.legacyPrismaBusinessId) throw new Error("FORBIDDEN: Selected business does not match membership");
    if (args.items.length > 200 || !Number.isSafeInteger(args.amountCents) || args.amountCents < 0) throw new Error("INVALID_ARGUMENT: Invalid cart");
    const errors: Array<{ inventoryId: string; message: string }> = [];
    const totals = new Map<string, { product: NonNullable<Awaited<ReturnType<typeof findProduct>>>; quantity: number; requestedId: string }>();
    async function findProduct(value: string) {
      const id = ctx.db.normalizeId("products", value);
      return id ? ctx.db.get(id) : ctx.db.query("products").withIndex("by_businessId_and_legacyPrismaId", q => q.eq("businessId", auth.businessId).eq("legacyPrismaId", value)).unique();
    }
    for (const item of args.items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) throw new Error("INVALID_ARGUMENT: Invalid quantity");
      const product = await findProduct(item.productId);
      if (!product || product.businessId !== auth.businessId || !product.isActive) {
        errors.push({ inventoryId: item.productId, message: "Inventory item is unavailable" });
        continue;
      }
      const previous = totals.get(product._id);
      totals.set(product._id, { product, quantity: (previous?.quantity ?? 0) + item.quantity, requestedId: previous?.requestedId ?? item.productId });
    }
    for (const { product, quantity, requestedId } of totals.values()) {
      const config = normalizeProductCommerceConfig(product);
      const validation = validateSaleQuantity({ quantity, allowFractional: product.allowFractionalWeight, quantityPrecision: config.quantityPrecision, minimumSaleQuantity: config.minimumSaleQuantity, quantityIncrement: config.quantityIncrement });
      if (!validation.valid) errors.push({ inventoryId: requestedId, message: "Quantity does not match the product's selling rules" });
      else if (validation.quantity > product.quantityOnHandGrams) errors.push({ inventoryId: requestedId, message: "Insufficient stock for the combined cart quantity" });
    }
    let credit: { valid: boolean; currentBalance: number; maxLimit: number; remaining: number | null; unlimited: boolean; warning?: string } = { valid: true, currentBalance: 0, maxLimit: 0, remaining: 0, unlimited: false };
    if (args.customerId) {
      const id = ctx.db.normalizeId("customers", args.customerId);
      const customer = id ? await ctx.db.get(id) : await ctx.db.query("customers").withIndex("by_businessId_and_legacyPrismaId", q => q.eq("businessId", auth.businessId).eq("legacyPrismaId", args.customerId!)).unique();
      if (!customer || customer.businessId !== auth.businessId || !customer.isActive) throw new Error("NOT_FOUND: Customer is unavailable");
      if (!Number.isSafeInteger(customer.creditLimitCents) || customer.creditLimitCents < 0 || !Number.isSafeInteger(customer.totalCreditUsedCents) || customer.totalCreditUsedCents < 0) throw new Error("INVALID_STATE: Credit requires reconciliation");
      const enabled = customer.creditEnabled !== false;
      const unlimited = enabled && customer.creditLimitCents === 0;
      const valid = args.amountCents === 0 || (enabled && Number.isSafeInteger(customer.totalCreditUsedCents + args.amountCents) && (unlimited || customer.totalCreditUsedCents + args.amountCents <= customer.creditLimitCents));
      credit = { valid, currentBalance: customer.totalCreditUsedCents / 100, maxLimit: customer.creditLimitCents / 100, remaining: !enabled ? 0 : unlimited ? null : (customer.creditLimitCents - customer.totalCreditUsedCents) / 100, unlimited, ...(valid ? {} : { warning: "Credit limit exceeded" }) };
    }
    return { stock: { valid: errors.length === 0, errors }, credit };
  },
});

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
