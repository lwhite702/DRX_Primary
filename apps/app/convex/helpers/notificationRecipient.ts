import type { QueryCtx, MutationCtx } from "../_generated/server";
import { requireUserAndBusiness } from "./auth";
import { requirePermission } from "./permissions";
export async function requireNotificationRecipient(ctx: QueryCtx | MutationCtx, expectedUserId: string, targetUserId: string) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHORIZED: Authentication required");
  if (identity.subject !== expectedUserId) throw new Error("FORBIDDEN: Operator changed");
  if (identity.subject === targetUserId) return;
  const platform = await ctx.db.query("platformAdminGrants").withIndex("by_userId", q => q.eq("userId", identity.subject)).unique();
  if (platform?.isActive) return;
  const auth = await requireUserAndBusiness(ctx); requirePermission(auth.userRecord, "MANAGE_MEMBERS");
  const recipient = await ctx.db.query("users").withIndex("by_clerkUserId_and_businessId", q => q.eq("clerkUserId", targetUserId).eq("businessId", auth.businessId)).unique();
  if (!recipient || recipient.status !== "ACTIVE") throw new Error("FORBIDDEN: Recipient is outside the active business");
  return auth.businessId;
}
