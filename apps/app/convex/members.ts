import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";

export const listMembers = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireUserAndBusiness(ctx);
    const members = await ctx.db
      .query("users")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .collect();

    const invites = await ctx.db
      .query("invites")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .filter((q) => q.eq(q.field("status"), "PENDING"))
      .collect();

    return { members, invites };
  },
});

export const inviteMember = mutation({
  args: {
    email: v.string(),
    role: v.string(), // "ADMIN" | "MEMBER"
  },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_MEMBERS");

    const now = Date.now();
    const token = `inv_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const expiresAt = now + 7 * 24 * 60 * 60 * 1000; // 7 days

    const inviteId = await ctx.db.insert("invites", {
      businessId: auth.businessId,
      email: args.email.toLowerCase(),
      token,
      role: args.role,
      status: "PENDING",
      invitedBy: auth.userId,
      expiresAt,
      createdAt: now,
    });

    return { inviteId, token };
  },
});

export const updateMemberRole = mutation({
  args: {
    targetUserId: v.id("users"),
    newRole: v.string(), // "ADMIN" | "MEMBER"
  },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_MEMBERS");

    const targetUser = await ctx.db.get(args.targetUserId);
    if (!targetUser || targetUser.businessId !== auth.businessId) {
      throw new Error("NOT_FOUND: User not found in organization");
    }

    if (targetUser.role === "OWNER") {
      throw new Error("FORBIDDEN: Cannot alter role of organization owner");
    }

    await ctx.db.patch(args.targetUserId, {
      role: args.newRole,
      updatedAt: Date.now(),
    });

    return { success: true };
  },
});
