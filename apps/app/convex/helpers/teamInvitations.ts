import type { Id } from "../_generated/dataModel";
import { normalizeTeamRole } from "../../lib/team/roles";
import type { MutationCtx } from "../_generated/server";
import type { AuthenticatedUser } from "./auth";
import { requireAssignableRole } from "./teamManagement";

export async function createTeamInvitation(ctx: MutationCtx, auth: AuthenticatedUser, args: { email: string; role: string }) {
  const role = requireAssignableRole(auth, args.role);
  const email = args.email.trim().toLowerCase();
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("INVALID_ARGUMENT: Enter a valid email address");
  const existingMember = await ctx.db.query("users").withIndex("by_email_and_businessId", q => q.eq("email", email).eq("businessId", auth.businessId)).filter(q => q.neq(q.field("status"), "REMOVED")).first();
  if (existingMember && existingMember.status !== "REMOVED") throw new Error("ALREADY_EXISTS: User is already a member");
  const now = Date.now();
  const existing = await ctx.db.query("invites").withIndex("by_businessId_and_email_and_status_and_expiresAt", q => q.eq("businessId", auth.businessId).eq("email", email).eq("status", "PENDING").gt("expiresAt", now)).first();
  if (existing) throw new Error("ALREADY_EXISTS: An active invitation already exists");
  // Convex supplies a seeded strong PRNG for deterministic mutation retries.
  const token = Array.from({ length: 32 }, () => Math.floor(Math.random() * 256).toString(16).padStart(2, "0")).join("");
  const expiresAt = now + 7 * 24 * 60 * 60 * 1000;
  const inviteId = await ctx.db.insert("invites", { businessId: auth.businessId, email, role, token, status: "PENDING", invitedBy: auth.userId, expiresAt, createdAt: now });
  await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "invite_member", entityType: "team_invitation", entityId: inviteId, metadata: JSON.stringify({ role }), timestamp: now });
  return { inviteId, token };
}

// Callers must establish verified recipient identity before invoking this shared transaction.
export async function acceptTeamInvitation(ctx: MutationCtx, args: { token: string; businessId: Id<"businesses"> }, identity: { subject: string; email: string; name?: string }) {
    const email = identity.email.trim().toLowerCase();
    const invite = await ctx.db.query("invites").withIndex("by_token", q => q.eq("token", args.token)).unique();
    if (!invite || invite.businessId !== args.businessId || invite.email !== email) throw new Error("NOT_FOUND: Invitation not found");
    const business = await ctx.db.get(invite.businessId);
    if (!business || business.isActive === false) throw new Error("FORBIDDEN: Business unavailable");
    if (invite.status === "ACCEPTED") {
      if (invite.acceptedBy !== identity.subject) throw new Error("FORBIDDEN: Invitation already claimed");
      return { status: "already_accepted" as const, businessId: invite.businessId };
    }
    const now = Date.now();
    if (invite.status === "EXPIRED" || (invite.status === "PENDING" && invite.expiresAt <= now)) {
      if (invite.status === "PENDING") await ctx.db.patch(invite._id, { status: "EXPIRED" });
      return { status: "expired" as const, businessId: invite.businessId };
    }
    if (invite.status !== "PENDING") throw new Error("FORBIDDEN: Invitation is unavailable");
    const role = invite.role === "MEMBER" || invite.role === "ADMIN" ? invite.role : normalizeTeamRole(invite.role);
    if (!role) throw new Error("INVALID_STATE: Invitation role requires reconciliation");
    const member = await ctx.db.query("users").withIndex("by_clerkUserId_and_businessId", q => q.eq("clerkUserId", identity.subject).eq("businessId", invite.businessId)).unique();
    // A stale invite cannot overwrite a live or suspended membership, or owner.
    if (member && (member.status !== "REMOVED" || member.clerkUserId === business.ownerId || member.role.toLowerCase() === "owner")) throw new Error("CONFLICT: Membership already exists");
    const emailMember = await ctx.db.query("users").withIndex("by_email_and_businessId", q => q.eq("email", email).eq("businessId", invite.businessId)).filter(q => q.neq(q.field("clerkUserId"), identity.subject)).first();
    if (emailMember) throw new Error("CONFLICT: Email belongs to another membership");
    if (member) {
      // A fresh invitation grants only its recorded role, never stale overrides.
      await ctx.db.patch(member._id, { status: "ACTIVE", role, permissions: {}, email, updatedAt: now });
    } else {
      const previous = await ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", identity.subject)).take(2);
      if (previous.length === 1 && previous[0].isDefaultMembership === undefined) await ctx.db.patch(previous[0]._id, { isDefaultMembership: true });
      await ctx.db.insert("users", { businessId: invite.businessId, clerkUserId: identity.subject, email, ...(identity.name ? { name: identity.name } : {}), role, permissions: {}, status: "ACTIVE", isDefaultMembership: previous.length === 0, createdAt: now, updatedAt: now });
    }
    await ctx.db.patch(invite._id, { status: "ACCEPTED", acceptedBy: identity.subject, acceptedAt: now });
    await ctx.db.insert("auditEvents", { businessId: invite.businessId, userId: identity.subject, action: "accept_team_invitation", entityType: "team_member", entityId: identity.subject, metadata: JSON.stringify({ role, invitationId: invite._id }), timestamp: now });
    return { status: "accepted" as const, businessId: invite.businessId };
}
