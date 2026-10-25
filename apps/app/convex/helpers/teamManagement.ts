import type { MutationCtx, QueryCtx } from "../_generated/server";
import type { AuthenticatedUser } from "./auth";
import { requirePermission } from "./permissions";
import { normalizeTeamRole } from "../../lib/team/roles";
export async function findMember(ctx: QueryCtx | MutationCtx, auth: AuthenticatedUser, id: string) {
  const normalized = ctx.db.normalizeId("users", id);
  const target = normalized ? await ctx.db.get(normalized) : await ctx.db.query("users").withIndex("by_clerkUserId_and_businessId", q => q.eq("clerkUserId", id).eq("businessId", auth.businessId)).unique();
  if (!target || target.businessId !== auth.businessId) throw new Error("NOT_FOUND: Member not found");
  return target;
}
export function requireAssignableRole(auth: AuthenticatedUser, value: string) {
  requirePermission(auth.userRecord, "MANAGE_MEMBERS");
  const role = value === "MEMBER" || value === "ADMIN" ? value : normalizeTeamRole(value);
  if (!role) throw new Error("INVALID_ARGUMENT: Invalid assignable role");
  if (role.toLowerCase() === "admin" && !canManagePrivilegedRoles(auth)) throw new Error("FORBIDDEN: Privileged role requires administrator permission");
  return role;
}
export function canManagePrivilegedRoles(auth: AuthenticatedUser) {
  const role = auth.userRecord.role.toLowerCase();
  return auth.businessRecord.ownerId === auth.userId || role === "owner" || role === "admin" || auth.userRecord.permissions?.["system.manage"] === true;
}
export async function changeMember(ctx: MutationCtx, auth: AuthenticatedUser, id: string, change: { role: string } | { remove: true }) {
  requirePermission(auth.userRecord, "MANAGE_MEMBERS");
  const target = await findMember(ctx, auth, id);
  if (target.clerkUserId === auth.userId) throw new Error("CONFLICT: You cannot change your own membership");
  if (target.clerkUserId === auth.businessRecord.ownerId || target.role.toLowerCase() === "owner") throw new Error("remove" in change ? "OWNER_PROTECTED: The business owner cannot be removed" : "FORBIDDEN: The business owner cannot be changed");
  const canManagePrivileged = canManagePrivilegedRoles(auth);
  const privileged = (role: string) => ["admin", "owner", "super_admin"].includes(role.toLowerCase());
  const role = "role" in change ? requireAssignableRole(auth, change.role) : null;
  if ("role" in change && !role) throw new Error("INVALID_ARGUMENT: Invalid assignable role");
  if ((privileged(target.role) || (role && privileged(role))) && !canManagePrivileged) throw new Error("FORBIDDEN: Privileged role requires administrator permission");
  if ("remove" in change) {
    if (target.status === "REMOVED") return target;
    await ctx.db.patch(target._id, { status: "REMOVED", updatedAt: Date.now() });
  } else {
    if (target.status === "REMOVED") throw new Error("NOT_FOUND: Member not found");
    if (target.role === role) return target;
    await ctx.db.patch(target._id, { role: role!, updatedAt: Date.now() });
  }
  await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId,
    action: "remove" in change ? "remove_member" : "role_update", entityType: "team_member", entityId: target.clerkUserId,
    metadata: JSON.stringify({ oldRole: target.role, ...(role ? { newRole: role } : {}) }), timestamp: Date.now() });
  return target;
}
