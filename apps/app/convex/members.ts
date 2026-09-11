import { acceptTeamInvitation, createTeamInvitation } from "./helpers/teamInvitations";
import { changeMember } from "./helpers/teamManagement";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { hasPermission } from "./helpers/permissions";

export const listMembers = query({
  args: {},
  returns: v.object({
    members: v.array(v.object({ _id: v.id("users"), _creationTime: v.number(), businessId: v.id("businesses"), clerkUserId: v.string(), email: v.string(), name: v.optional(v.string()), role: v.string(), status: v.string(), createdAt: v.number(), updatedAt: v.number() })),
    invites: v.array(v.object({ _id: v.id("invites"), _creationTime: v.number(), businessId: v.id("businesses"), email: v.string(), role: v.string(), status: v.string(), invitedBy: v.string(), expiresAt: v.number(), createdAt: v.number() })),
  }),
  handler: async (ctx) => {
    const auth = await requireUserAndBusiness(ctx);
    const members = await ctx.db
      .query("users")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .collect();

    const invites = hasPermission(auth.userRecord, "MANAGE_MEMBERS") ? await ctx.db
      .query("invites")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .filter((q) => q.and(q.eq(q.field("status"), "PENDING"), q.gt(q.field("expiresAt"), Date.now())))
      .collect() : [];

    return {
      members: members.filter(member => member.status === "ACTIVE").map(member => ({
        _id: member._id, _creationTime: member._creationTime, businessId: member.businessId,
        clerkUserId: member.clerkUserId, email: member.email, name: member.name,
        role: member.role, status: member.status, createdAt: member.createdAt, updatedAt: member.updatedAt,
      })),
      invites: invites.map(invite => ({ _id: invite._id, _creationTime: invite._creationTime, businessId: invite.businessId, email: invite.email, role: invite.role, status: invite.status, invitedBy: invite.invitedBy, expiresAt: invite.expiresAt, createdAt: invite.createdAt })),
    };
  },
});

export const inviteMember = mutation({
  args: {
    email: v.string(),
    role: v.string(), // "ADMIN" | "MEMBER"
  },
  returns: v.object({ inviteId: v.id("invites"), token: v.string() }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    return createTeamInvitation(ctx, auth, args);
  },
});

export const updateMemberRole = mutation({
  args: {
    targetUserId: v.id("users"),
    newRole: v.string(), // "ADMIN" | "MEMBER"
  },
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    await changeMember(ctx, auth, args.targetUserId, { role: args.newRole });

    return { success: true };
  },
});


export const acceptInvitation = mutation({
  args: { token: v.string(), businessId: v.id("businesses") },
  returns: v.object({ status: v.union(v.literal("accepted"), v.literal("already_accepted"), v.literal("expired")), businessId: v.id("businesses") }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHORIZED: Authentication required");
    // Possession of a link alone cannot assign a membership to another identity.
    if (identity.emailVerified !== true || typeof identity.email !== "string") throw new Error("FORBIDDEN: Verified email required");
    return acceptTeamInvitation(ctx, args, { subject: identity.subject, email: identity.email, ...(identity.name ? { name: identity.name } : {}) });
  },
});
