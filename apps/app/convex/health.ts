import { query } from "./_generated/server";
import { v } from "convex/values";

/** Public readiness probe: bounded database read, no tenant data returned. */
export const readiness = query({
  args: {},
  returns: v.literal(true),
  handler: async (ctx) => {
    await ctx.db.query("businesses").take(1);
    return true as const;
  },
});
