import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";

export const getBusinessSettings = query({
  args: { clerkUserId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx, args.clerkUserId);
    const settings = await ctx.db
      .query("businessSettings")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .unique();

    return {
      business: auth.businessRecord,
      settings: settings || null,
    };
  },
});

export const updateBusinessSettings = mutation({
  args: {
    clerkUserId: v.optional(v.string()),
    name: v.optional(v.string()),
    taxRateBps: v.optional(v.number()),
    collectTax: v.optional(v.boolean()),
    posManagerPin: v.optional(v.string()),
    themePreference: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx, args.clerkUserId);
    requirePermission(auth.userRecord, "MANAGE_MEMBERS");

    const now = Date.now();

    // 1. Update Business Profile
    if (args.name !== undefined || args.taxRateBps !== undefined || args.collectTax !== undefined) {
      await ctx.db.patch(auth.businessId, {
        ...(args.name !== undefined && { name: args.name }),
        ...(args.taxRateBps !== undefined && { taxRateBps: args.taxRateBps }),
        ...(args.collectTax !== undefined && { collectTax: args.collectTax }),
        updatedAt: now,
      });
    }

    // 2. Update or Insert Business Settings Record
    const existingSettings = await ctx.db
      .query("businessSettings")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .unique();

    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        ...(args.posManagerPin !== undefined && { posManagerPin: args.posManagerPin }),
        ...(args.themePreference !== undefined && { themePreference: args.themePreference }),
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("businessSettings", {
        businessId: auth.businessId,
        posManagerPin: args.posManagerPin,
        themePreference: args.themePreference || "dark",
        createdAt: now,
        updatedAt: now,
      });
    }

    return { success: true };
  },
});
