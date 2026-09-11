"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { posthogServerFlagProvider } from "../lib/flags/posthog-server-provider";
import { OPS_AVAILABILITY_FLAGS } from "../lib/posthog/flags-manifest";
export const save = action({
  args: { expectedUserId: v.string(), preferencesJson: v.string(), expectedRevision: v.optional(v.number()) },
  returns: v.object({ userId: v.string(), preferencesJson: v.string(), revision: v.number() }),
  handler: async (ctx, args): Promise<{ userId: string; preferencesJson: string; revision: number }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHORIZED: Authentication required");
    if (identity.subject !== args.expectedUserId) throw new Error("FORBIDDEN: Operator changed");
    if (new TextEncoder().encode(args.preferencesJson).length > 16384) throw new Error("INVALID_ARGUMENT: Preferences exceed size limit");
    for (const flag of [OPS_AVAILABILITY_FLAGS.notificationsPreferencesWrite, "feat_notifications_preferences_write"]) {
      const enabled = await posthogServerFlagProvider.getBooleanFlag(flag, { distinctId: identity.subject }, false);
      if (!enabled) throw new Error("FEATURE_DISABLED: Notification preference writes are unavailable");
    }
    return ctx.runMutation(internal.notificationPreferences.save, args);
  },
});
