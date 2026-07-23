import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createBusinessOnboarding = mutation({
  args: {
    clerkUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    businessName: v.string(),
    businessType: v.optional(v.string()),
    clerkOrgId: v.optional(v.string()),
    currency: v.optional(v.string()),
    timezone: v.optional(v.string()),
    taxRateBps: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", args.clerkUserId))
      .unique();

    if (existingUser) {
      return {
        businessId: existingUser.businessId,
        userId: existingUser._id,
        status: "ALREADY_ONBOARDED",
      };
    }

    // 1. Create Business
    const businessId = await ctx.db.insert("businesses", {
      clerkOrgId: args.clerkOrgId,
      name: args.businessName,
      businessType: args.businessType || "Retail POS",
      ownerId: args.clerkUserId,
      currency: args.currency || "USD",
      timezone: args.timezone || "America/New_York",
      collectTax: true,
      taxRateBps: args.taxRateBps ?? 825, // 8.25% default
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create User as OWNER
    const userId = await ctx.db.insert("users", {
      clerkUserId: args.clerkUserId,
      email: args.email,
      name: args.name,
      role: "OWNER",
      businessId,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });

    // 3. Log Immutable Audit Event
    await ctx.db.insert("auditEvents", {
      businessId,
      userId: args.clerkUserId,
      action: "BUSINESS_ONBOARDED",
      entityType: "business",
      entityId: businessId,
      metadata: JSON.stringify({
        businessName: args.businessName,
        ownerEmail: args.email,
      }),
      timestamp: now,
    });

    return {
      businessId,
      userId,
      status: "ONBOARDING_SUCCESS",
    };
  },
});
