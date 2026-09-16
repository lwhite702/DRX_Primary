import { query } from "./_generated/server";
import { v } from "convex/values";
import { findCurrentMembership } from "./helpers/auth";
export const currentProfile = query({
  args: { expectedUserId: v.string() },
  returns: v.union(v.null(), v.object({ email: v.string(), name: v.union(v.string(), v.null()) })),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHORIZED: Authentication required");
    if (identity.subject !== args.expectedUserId) throw new Error("FORBIDDEN: Operator changed");
    const member = await findCurrentMembership(ctx, identity);
    if (!member) return null;
    const business = await ctx.db.get(member.businessId);
    if (member.status !== "ACTIVE" || !business || business.isActive === false) throw new Error("FORBIDDEN: Active membership required");
    return { email: member.email, name: member.name ?? null };
  },
});
