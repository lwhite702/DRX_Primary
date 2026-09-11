import { paginationOptsValidator } from "convex/server";
import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
const option = v.object({ id: v.id("deliveryProfiles"), name: v.string(), provider: v.optional(v.string()), base_price: v.number(), allow_price_override: v.boolean() });
export const list = query({
  args: { businessId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(option), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx); requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
    if (args.businessId !== auth.businessId && args.businessId !== auth.businessRecord.legacyPrismaBusinessId) throw new Error("FORBIDDEN: Business mismatch");
    const result = await ctx.db.query("deliveryProfiles").withIndex("by_businessId_and_isActive", q => q.eq("businessId", auth.businessId).eq("isActive", true)).paginate({ ...args.paginationOpts, numItems: Math.min(100, Math.max(1, args.paginationOpts.numItems)) });
    return { page: result.page.map(profile => ({ id: profile._id, name: profile.name, provider: profile.provider, base_price: profile.basePriceCents / 100, allow_price_override: profile.allowPriceOverride })), isDone: result.isDone, continueCursor: result.continueCursor };
  },
});
export const resolve = query({
  args: { businessId: v.string(), profileId: v.optional(v.string()), customerFeeCents: v.number() },
  returns: v.object({ profileId: v.optional(v.id("deliveryProfiles")), vendorFeeCents: v.number(), customerFeeCents: v.number(), chargeCustomer: v.boolean(), vendorExpenseKnown: v.boolean() }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx); requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
    if (args.businessId !== auth.businessId && args.businessId !== auth.businessRecord.legacyPrismaBusinessId) throw new Error("FORBIDDEN: Business mismatch");
    if (!Number.isSafeInteger(args.customerFeeCents) || args.customerFeeCents < 0) throw new Error("INVALID_ARGUMENT: Invalid delivery charge");
    let profile;
    if (args.profileId) {
      const id = ctx.db.normalizeId("deliveryProfiles", args.profileId);
      profile = id ? await ctx.db.get(id) : await ctx.db.query("deliveryProfiles").withIndex("by_businessId_and_legacyPrismaId", q => q.eq("businessId", auth.businessId).eq("legacyPrismaId", args.profileId!)).unique();
      if (!profile || profile.businessId !== auth.businessId || !profile.isActive) throw new Error("NOT_FOUND: Delivery profile is unavailable");
      if (!profile.allowPriceOverride && profile.basePriceCents !== args.customerFeeCents) throw new Error("CONFLICT: Delivery charge must match its profile");
    }
    return { profileId: profile?._id, vendorFeeCents: profile?.vendorFeeCents ?? 0, customerFeeCents: args.customerFeeCents, chargeCustomer: args.customerFeeCents > 0, vendorExpenseKnown: profile?.vendorFeeCents !== undefined };
  },
});
export const save = mutation({
  args: { profileId: v.optional(v.id("deliveryProfiles")), name: v.string(), provider: v.optional(v.string()), basePriceCents: v.number(), vendorFeeCents: v.optional(v.number()), allowPriceOverride: v.boolean(), isActive: v.boolean() },
  returns: v.id("deliveryProfiles"),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx); requirePermission(auth.userRecord, "MANAGE_COMMERCE_SETTINGS");
    const name = args.name.trim();
    if (!name || name.length > 255 || (args.provider?.length ?? 0) > 100 || ![args.basePriceCents, args.vendorFeeCents ?? 0].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error("INVALID_ARGUMENT: Invalid delivery profile");
    const { profileId, ...fields } = args;
    if (profileId) {
      const existing = await ctx.db.get(profileId);
      if (!existing || existing.businessId !== auth.businessId) throw new Error("NOT_FOUND: Delivery profile is unavailable");
      await ctx.db.patch(profileId, { ...fields, name, updatedAt: Date.now() });
    }
    const id = profileId ?? await ctx.db.insert("deliveryProfiles", { ...fields, name, businessId: auth.businessId, createdAt: Date.now(), updatedAt: Date.now() });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "DELIVERY_PROFILE_SAVED", entityType: "deliveryProfile", entityId: id, metadata: JSON.stringify({ isActive: args.isActive, basePriceCents: args.basePriceCents }), timestamp: Date.now() });
    return id;
  },
});
