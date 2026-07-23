import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";

export const createCategory = mutation({
  args: {
    clerkUserId: v.optional(v.string()),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx, args.clerkUserId);
    requirePermission(auth.userRecord, "MANAGE_PRODUCTS");

    const existing = await ctx.db
      .query("categories")
      .withIndex("by_businessId_and_name", (q: any) =>
        q.eq("businessId", auth.businessId).eq("name", args.name)
      )
      .unique();

    if (existing) {
      throw new Error(`ALREADY_EXISTS: Category '${args.name}' already exists`);
    }

    const categoryId = await ctx.db.insert("categories", {
      businessId: auth.businessId,
      name: args.name,
      description: args.description,
      color: args.color || "#10B981",
      createdAt: Date.now(),
    });

    return categoryId;
  },
});

export const listCategories = query({
  args: { clerkUserId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx, args.clerkUserId);
    const categories = await ctx.db
      .query("categories")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .collect();

    return categories;
  },
});
