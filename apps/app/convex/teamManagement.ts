import { createTeamInvitation } from "./helpers/teamInvitations";
import { changeMember, findMember } from "./helpers/teamManagement";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { paginationOptsValidator } from "convex/server";
import { requireSelectedBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
const member = v.object({ id: v.string(), business_id: v.string(), user_id: v.string(), role: v.string(), permissions: v.record(v.string(), v.boolean()), created_at: v.number(), updated_at: v.number(), email: v.string(), name: v.union(v.string(), v.null()), phone: v.string(), status: v.string() });
export const listTeamMembers = query({
  args: { businessId: v.string(), expectedUserId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(member), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_MEMBERS");
    const result = await ctx.db.query("users").withIndex("by_businessId", q => q.eq("businessId", auth.businessId)).order("desc").paginate({ ...args.paginationOpts, numItems: Math.min(100, Math.max(1, args.paginationOpts.numItems)) });
    return { isDone: result.isDone, continueCursor: result.continueCursor, page: result.page.filter(user => user.status !== "REMOVED").map(user => ({
      id: user._id, business_id: auth.businessId, user_id: user.clerkUserId,
      role: user.role.toLowerCase(), permissions: user.permissions ?? {},
      created_at: user.createdAt, updated_at: user.updatedAt, email: user.email,
      name: user.name ?? null, phone: user.phoneNumber ?? "", status: user.status.toLowerCase(),
    })) };
  },
});

const context = { businessId: v.string(), expectedUserId: v.string(), id: v.string() };
export const getTeamMember = query({
  args: context, returns: member,
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_MEMBERS");
    const user = await findMember(ctx, auth, args.id);
    if (user.status === "REMOVED") throw new Error("NOT_FOUND: Member not found");
    return { id: user._id, business_id: auth.businessId, user_id: user.clerkUserId, role: user.role.toLowerCase(), permissions: user.permissions ?? {}, created_at: user.createdAt, updated_at: user.updatedAt, email: user.email, name: user.name ?? null, phone: user.phoneNumber ?? "", status: user.status.toLowerCase() };
  },
});
export const updateTeamRole = mutation({
  args: { ...context, role: v.string() }, returns: v.object({ id: v.string(), role: v.string() }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    const target = await changeMember(ctx, auth, args.id, { role: args.role });
    return { id: target.clerkUserId, role: args.role.trim().toLowerCase() };
  },
});
export const removeTeamMember = mutation({
  args: context, returns: v.null(),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    await changeMember(ctx, auth, args.id, { remove: true });
    return null;
  },
});

// Keep historical events readable for removed memberships, with separate audit authorization.
export const listTeamMemberAudit = query({
  args: { ...context, paginationOpts: paginationOptsValidator },
  returns: v.object({
    page: v.array(v.object({ id: v.string(), userId: v.string(), businessId: v.string(), action: v.string(), entityType: v.string(), entityId: v.string(), metadata: v.string(), createdAt: v.number() })),
    isDone: v.boolean(), continueCursor: v.string(),
  }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_MEMBERS");
    requirePermission(auth.userRecord, "VIEW_AUDIT_LOGS");
    const target = await findMember(ctx, auth, args.id);
    const result = await ctx.db.query("auditEvents")
      .withIndex("by_businessId_and_entityType_and_entityId_and_timestamp", q => q.eq("businessId", auth.businessId).eq("entityType", "team_member").eq("entityId", target.clerkUserId))
      .order("desc").paginate({ ...args.paginationOpts, numItems: Math.min(100, Math.max(1, args.paginationOpts.numItems)) });
    return { isDone: result.isDone, continueCursor: result.continueCursor, page: result.page.map(event => ({
      id: event._id, userId: event.userId, businessId: event.businessId, action: event.action,
      entityType: event.entityType, entityId: event.entityId, metadata: event.metadata, createdAt: event.timestamp,
    })) };
  },
});

export const prepareTeamInvitation = mutation({
  args: { businessId: v.string(), expectedUserId: v.string(), email: v.string(), role: v.string() },
  returns: v.object({ inviteId: v.id("invites"), token: v.string(), email: v.string(), role: v.string(), expiresAt: v.number() }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    const result = await createTeamInvitation(ctx, auth, args);
    await ctx.db.patch(result.inviteId, { deliveryStatus: "PREPARED" });
    const invite = (await ctx.db.get(result.inviteId))!;
    return { ...result, email: invite.email, role: invite.role, expiresAt: invite.expiresAt };
  },
});
export const recordTeamInvitationDelivery = mutation({
  args: { businessId: v.string(), expectedUserId: v.string(), inviteId: v.id("invites"), providerInvitationId: v.optional(v.string()) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_MEMBERS");
    const invite = await ctx.db.get(args.inviteId);
    if (!invite || invite.businessId !== auth.businessId) throw new Error("NOT_FOUND: Invitation not found");
    if (invite.invitedBy !== auth.userId) throw new Error("FORBIDDEN: Invitation belongs to another operator");
    if (args.providerInvitationId !== undefined && (!args.providerInvitationId.trim() || args.providerInvitationId.length > 256)) throw new Error("INVALID_ARGUMENT: Invalid invitation identifier");
    if (invite.providerInvitationId) {
      if (args.providerInvitationId && args.providerInvitationId !== invite.providerInvitationId) throw new Error("CONFLICT: Invitation delivery requires reconciliation");
      return null;
    }
    const deliveryStatus = args.providerInvitationId ? "SENT" as const : "UNKNOWN" as const;
    if (invite.deliveryStatus === deliveryStatus) return null;
    await ctx.db.patch(invite._id, { deliveryStatus, ...(args.providerInvitationId ? { providerInvitationId: args.providerInvitationId } : {}) });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "invitation_delivery", entityType: "team_invitation", entityId: invite._id, metadata: JSON.stringify({ deliveryStatus }), timestamp: Date.now() });
    return null;
  },
});
