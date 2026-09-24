import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const createTicket = mutation({
  args: { subject: v.string(), message: v.string(), priority: v.union(v.literal("low"), v.literal("normal"), v.literal("high"), v.literal("critical")) },
  returns: v.null(),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHENTICATED: Authentication required");
    await ctx.db.insert("supportTickets", { userId: identity.subject, subject: args.subject, message: args.message, priority: args.priority, status: "open", createdAt: Date.now() });
    return null;
  },
});
