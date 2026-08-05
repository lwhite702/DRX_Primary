import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const getCurrentOnboardingStatus = query({
  args: {},
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("UNAUTHENTICATED");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user) return { status: "NEEDS_BUSINESS_ONBOARDING" as const };
    if (user.status !== "ACTIVE") return { status: "INACTIVE" as const };

    const business = await ctx.db.get(user.businessId);
    if (!business) return { status: "BUSINESS_MISSING" as const };

    return {
      status: "READY" as const,
      businessId: business._id,
      userId: user._id,
    };
  },
});

export const createBusinessOnboarding = mutation({
  args: {
    name: v.optional(v.string()),
    businessName: v.string(),
    businessType: v.optional(v.string()),
    clerkOrgId: v.optional(v.string()),
    currency: v.optional(v.string()),
    timezone: v.optional(v.string()),
    collectTax: v.optional(v.boolean()),
    taxRateBps: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("UNAUTHENTICATED: Authentication required to onboard business");
    }
    const clerkUserId = identity.subject;
    const email = identity.email || "";
    const now = Date.now();

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
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
      ownerId: clerkUserId,
      currency: args.currency || "USD",
      timezone: args.timezone || "America/New_York",
      collectTax: args.collectTax ?? true,
      taxRateBps: args.collectTax === false ? 0 : (args.taxRateBps ?? 825),
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create User as OWNER
    const userId = await ctx.db.insert("users", {
      clerkUserId,
      email,
      name: args.name,
      role: "OWNER",
      businessId,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });

    // 3. Log the audit event
    await ctx.db.insert("auditEvents", {
      businessId,
      userId: clerkUserId,
      action: "BUSINESS_ONBOARDED",
      entityType: "business",
      entityId: businessId,
      metadata: JSON.stringify({
        businessName: args.businessName,
        ownerEmail: email,
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
