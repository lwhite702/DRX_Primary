"use node";
import { Webhook } from "svix";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

const object = (value: unknown): Record<string, unknown> => value && typeof value === "object" && !Array.isArray(value) ? value as Record<string, unknown> : {};
export const handle = action({
  args: { body: v.string(), svixId: v.string(), svixTimestamp: v.string(), svixSignature: v.string() },
  returns: v.string(),
  handler: async (ctx, args): Promise<string> => {
    const secret = process.env.CLERK_WEBHOOK_SECRET;
    if (!secret) throw new Error("UNAVAILABLE: Clerk webhook verification is not configured");
    if (args.body.length > 256_000) throw new Error("INVALID_ARGUMENT: Webhook is too large");
    let event: Record<string, unknown>;
    try { event = object(new Webhook(secret).verify(args.body, { "svix-id": args.svixId, "svix-timestamp": args.svixTimestamp, "svix-signature": args.svixSignature })); }
    catch { throw new Error("UNAUTHORIZED: Invalid webhook signature"); }
    const data = object(event.data), metadata = object(data.public_metadata);
    if (event.type === "organization.created") {
      if (typeof data.id !== "string" || !data.id || typeof data.name !== "string" || !data.name.trim()) throw new Error("INVALID_ARGUMENT: Invalid organization event");
      return ctx.runMutation(internal.clerkIdentityEvents.recordOrganization, { sourceEventId: args.svixId, clerkOrgId: data.id, name: data.name, ...(typeof data.created_by === "string" && data.created_by ? { createdBy: data.created_by } : {}) });
    }
    if (event.type === "session.created" || event.type === "session.ended" || event.type === "session.removed" || event.type === "session.revoked") {
      const userId = data.user_id ?? data.userId, sessionId = data.id ?? data.session_id;
      if (typeof userId !== "string" || !userId || typeof sessionId !== "string" || !sessionId) throw new Error("INVALID_ARGUMENT: Invalid session identity");
      const activity = object(data.latest_activity);
      const text = (value: unknown, limit: number) => typeof value === "string" && value.length <= limit ? value : undefined;
      const optional = (key: string, value: string | undefined) => value === undefined ? {} : { [key]: value };
      return ctx.runMutation(internal.clerkIdentityEvents.recordSession, {
        sourceEventId: args.svixId, userId, sessionId, eventType: event.type,
        ...(typeof event.timestamp === "number" && Number.isFinite(event.timestamp) ? { occurredAt: event.timestamp } : {}),
        ...optional("ipAddress", text(activity.ip_address ?? data.ip_address, 128)),
        ...optional("userAgent", text(activity.user_agent ?? data.user_agent, 2048)),
        ...optional("deviceType", text(activity.device_type ?? data.device_type, 128)),
        ...optional("city", text(activity.city ?? data.city, 256)),
        ...optional("country", text(activity.country ?? data.country, 256)),
      });
    }
    if (event.type !== "user.created") return "ignored";
    if (typeof data.id !== "string" || !data.id) throw new Error("INVALID_ARGUMENT: Missing user identity");
    const businessId = metadata.drxBusinessId, token = metadata.drxInviteToken;
    // Canonical onboarding owns business creation. A Clerk signup alone must not
    // create an unrelated personal business ahead of an invited/organization flow.
    if (businessId === undefined && token === undefined) return "awaiting_onboarding";
    if (typeof businessId !== "string" || !businessId || typeof token !== "string" || !token) throw new Error("INVALID_ARGUMENT: Incomplete invitation metadata");
    const addresses = Array.isArray(data.email_addresses) ? data.email_addresses.map(object) : [];
    const primary = addresses.find(address => address.id === data.primary_email_address_id);
    if (!primary || typeof primary.email_address !== "string" || object(primary.verification).status !== "verified") throw new Error("FORBIDDEN: Verified primary email required");
    const name = [data.first_name, data.last_name].filter((value): value is string => typeof value === "string" && Boolean(value.trim())).join(" ").trim();
    return ctx.runMutation(internal.clerkMembershipEvents.acceptVerifiedInvitation, { userId: data.id, email: primary.email_address, businessId, token, ...(name ? { name } : {}) });
  },
});

// Retain the original action name for existing signed-envelope callers.
export const userCreated = handle;
