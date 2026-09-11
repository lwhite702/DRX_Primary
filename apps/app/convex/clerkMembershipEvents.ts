import { internalMutation } from "./_generated/server";
import { v } from "convex/values";
import { acceptTeamInvitation } from "./helpers/teamInvitations";

export const acceptVerifiedInvitation = internalMutation({
  args: { userId: v.string(), email: v.string(), name: v.optional(v.string()), businessId: v.string(), token: v.string() },
  returns: v.string(),
  handler: async (ctx, args) => {
    const businessId = ctx.db.normalizeId("businesses", args.businessId);
    if (!businessId) throw new Error("INVALID_STATE: Historical invitation requires reconciliation");
    const result = await acceptTeamInvitation(ctx, { businessId, token: args.token }, { subject: args.userId, email: args.email, ...(args.name ? { name: args.name } : {}) });
    return result.status;
  },
});
