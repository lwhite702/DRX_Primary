"use node";
import { createHash } from "node:crypto";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { Id } from "./_generated/dataModel";
import { posthogServerFlagProvider } from "../lib/flags/posthog-server-provider";
import { OPS_AVAILABILITY_FLAGS } from "../lib/posthog/flags-manifest";
export const createAlert = action({
  args: { expectedUserId: v.string(), targetUserId: v.string(), requestId: v.string(), type: v.string(), message: v.string(), metadataJson: v.optional(v.string()) },
  returns: v.object({ notificationId: v.id("notifications"), userId: v.string(), message: v.string() }),
  handler: async (ctx, args): Promise<{ notificationId: Id<"notifications">; userId: string; message: string }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHORIZED: Authentication required");
    if (identity.subject !== args.expectedUserId) throw new Error("FORBIDDEN: Operator changed");
    if (!args.targetUserId.trim() || args.targetUserId.length > 200 || !args.requestId.trim() || args.requestId.length > 200 || !args.type.trim() || args.type.length > 50 || !args.message.trim() || Buffer.byteLength(args.message) > 8192 || (args.metadataJson !== undefined && Buffer.byteLength(args.metadataJson) > 8192)) throw new Error("INVALID_ARGUMENT: Invalid alert");
    if (args.metadataJson !== undefined) {
      let metadata; try { metadata = JSON.parse(args.metadataJson); } catch { throw new Error("INVALID_ARGUMENT: Invalid metadata"); }
      if (!metadata || typeof metadata !== "object" || Array.isArray(metadata)) throw new Error("INVALID_ARGUMENT: Invalid metadata");
    }
    for (const flag of [OPS_AVAILABILITY_FLAGS.notificationsAlertsWrite, "feat_notifications_alert_write"]) {
      if (!await posthogServerFlagProvider.getBooleanFlag(flag, { distinctId: identity.subject }, false)) throw new Error("FEATURE_DISABLED: Alert creation is unavailable");
    }
    const fingerprint = createHash("sha256").update(JSON.stringify([args.targetUserId, args.type, args.message, args.metadataJson ?? null])).digest("hex");
    return ctx.runMutation(internal.notifications.createAlert, { ...args, fingerprint });
  },
});
