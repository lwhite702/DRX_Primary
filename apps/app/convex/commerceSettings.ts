import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { z } from "zod";
import { query, mutation } from "./_generated/server";
import type { QueryCtx, MutationCtx } from "./_generated/server";
import { requireUserAndBusiness } from "./helpers/auth";
import { hasPermission, requirePermission } from "./helpers/permissions";
import { merchantCommerceSettingsSchema, getDefaultCommerceSettings } from "../lib/commerce/config";
import { newProductCommerceSchema, canonicalCreationCommerce } from "../lib/commerce/product-creation";
const patchSchema = z.object({
  merchant: merchantCommerceSettingsSchema.optional(),
  product: z.object({ inventoryId: z.string().min(1), baseUnitPrice: z.number().positive(), config: newProductCommerceSchema }).optional(),
}).strict().refine(value => value.merchant || value.product);
async function access(ctx: QueryCtx | MutationCtx, selectedBusinessId?: string) {
  const auth = await requireUserAndBusiness(ctx);
  requirePermission(auth.userRecord, "MANAGE_COMMERCE_SETTINGS");
  if (selectedBusinessId && selectedBusinessId !== auth.businessId && selectedBusinessId !== auth.businessRecord.legacyPrismaBusinessId) throw new Error("FORBIDDEN: Business mismatch");
  return auth;
}
export const getSettings = query({
  args: { businessId: v.optional(v.string()) },
  returns: v.object({ businessId: v.id("businesses"), merchantJson: v.string() }),
  handler: async (ctx, args) => {
    const auth = await access(ctx, args.businessId);
    const settings = await ctx.db.query("businessSettings").withIndex("by_businessId", q => q.eq("businessId", auth.businessId)).unique();
    const defaults = getDefaultCommerceSettings().merchant;
    const merchant = { ...defaults,
      loyaltyCombinationPolicy: settings?.loyaltyCombinationPolicy ?? defaults.loyaltyCombinationPolicy,
      loyaltyTiers: (settings?.loyaltyTiers ?? []).map((tier, index) => ({ id: `tier-${index}`, label: tier.name, minimumSpendCents: tier.minimumSpendCents, discountRate: tier.discountRateBps / 10000 })),
      deliveryFeeTaxable: settings?.deliveryFeeTaxable ?? defaults.deliveryFeeTaxable,
      dispatchSlaMinutes: settings?.deliveryDispatchSlaMinutes ?? defaults.dispatchSlaMinutes,
      escalationDelayMinutes: settings?.deliveryManagerEscalationMinutes ?? defaults.escalationDelayMinutes,
      managerNotificationTargets: settings?.deliveryManagerNotificationUserIds ?? [],
    };
    return { businessId: auth.businessId, merchantJson: JSON.stringify(merchant) };
  },
});
export const customerOptions = query({
  args: { businessId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(v.object({ id: v.id("customers"), label: v.string() })), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const auth = await access(ctx, args.businessId);
    if (args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 200) throw new Error("INVALID_ARGUMENT: Page size");
    const rows = await ctx.db.query("customers").withIndex("by_businessId", q => q.eq("businessId", auth.businessId)).paginate(args.paginationOpts);
    return { page: rows.page.filter(row => row.isActive).map(row => ({ id: row._id, label: [row.firstName, row.lastName].filter(Boolean).join(" ") || `Customer ${row._id.slice(0, 8)}` })), isDone: rows.isDone, continueCursor: rows.continueCursor };
  },
});
export const saveSettings = mutation({
  args: { businessId: v.optional(v.string()), patchJson: v.string() },
  returns: v.null(),
  handler: async (ctx, args) => {
    const auth = await access(ctx, args.businessId);
    if (args.patchJson.length > 64000) throw new Error("INVALID_ARGUMENT: Settings too large");
    let input: z.infer<typeof patchSchema>;
    try { input = patchSchema.parse(JSON.parse(args.patchJson)); } catch { throw new Error("INVALID_ARGUMENT: Invalid commerce settings"); }
    const now = Date.now();
    if (input.merchant) {
      const merchant = input.merchant;
      const managerIds = [];
      for (const target of merchant.managerNotificationTargets) {
        const byId = await ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", target)).unique();
        const user = byId ?? await ctx.db.query("users").withIndex("by_email", q => q.eq("email", target)).unique();
        if (!user || user.businessId !== auth.businessId || user.status !== "ACTIVE" || !hasPermission(user, "MANAGE_COMMERCE_SETTINGS")) throw new Error("INVALID_ARGUMENT: Notification recipient must be a manager in this business");
        managerIds.push(user.clerkUserId);
      }
      const loyaltyTiers = merchant.loyaltyTiers.map(tier => {
        const rate = tier.discountRate * 10000;
        if (!Number.isSafeInteger(Math.round(rate)) || Math.abs(rate - Math.round(rate)) > 1e-6) throw new Error("INVALID_ARGUMENT: Loyalty rate must fit basis-point precision");
        return { name: tier.label, minimumSpendCents: tier.minimumSpendCents, discountRateBps: Math.round(rate) };
      }).sort((a, b) => a.minimumSpendCents - b.minimumSpendCents);
      const existing = await ctx.db.query("businessSettings").withIndex("by_businessId", q => q.eq("businessId", auth.businessId)).unique();
      const values = { loyaltyCombinationPolicy: merchant.loyaltyCombinationPolicy, loyaltyTiers,
        deliveryFeeTaxable: merchant.deliveryFeeTaxable, deliveryDispatchSlaMinutes: merchant.dispatchSlaMinutes,
        deliveryManagerEscalationMinutes: merchant.escalationDelayMinutes, deliveryManagerNotificationUserIds: [...new Set(managerIds)], updatedAt: now };
      if (existing) await ctx.db.patch(existing._id, values);
      else await ctx.db.insert("businessSettings", { businessId: auth.businessId, ...values, createdAt: now });
    }
    if (input.product) {
      const { inventoryId, baseUnitPrice, config } = input.product;
      const id = ctx.db.normalizeId("products", inventoryId);
      const product = id ? await ctx.db.get(id) : await ctx.db.query("products").withIndex("by_businessId_and_legacyPrismaId", q => q.eq("businessId", auth.businessId).eq("legacyPrismaId", inventoryId)).unique();
      if (!product || product.businessId !== auth.businessId || !product.isActive) throw new Error("NOT_FOUND: Product unavailable");
      const cents = Math.round(baseUnitPrice * 100);
      if (!Number.isSafeInteger(cents) || Math.abs(cents - baseUnitPrice * 100) > 1e-6) throw new Error("INVALID_ARGUMENT: Price must fit cents");
      const stock = product.quantityOnHandGrams * 10 ** config.decimalPrecision;
      if ((!config.fractionalEnabled && !Number.isInteger(product.quantityOnHandGrams)) || Math.abs(stock - Math.round(stock)) > 1e-6) throw new Error("CONFLICT: Existing stock does not fit these quantity rules");
      if (product.quantityOnHandGrams && product.sellingUnit && product.sellingUnit !== config.sellingUnit) throw new Error("CONFLICT: Reconcile stock before changing its unit");
      const canonical = canonicalCreationCommerce(config);
      if (canonical.bulkPriceTiers.some(tier => tier.unitPriceCents > cents)) throw new Error("INVALID_ARGUMENT: Bulk price exceeds base price");
      await ctx.db.patch(product._id, { ...canonical, sellingPriceCents: cents, allowFractionalWeight: config.fractionalEnabled, updatedAt: now });
    }
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "COMMERCE_SETTINGS_UPDATED", entityType: "business", entityId: auth.businessId,
      metadata: JSON.stringify({ merchantChanged: Boolean(input.merchant), productChanged: Boolean(input.product) }), timestamp: now });
    return null;
  },
});
