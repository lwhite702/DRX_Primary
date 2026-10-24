"use node";
import { action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

export const revoke = action({
  args: { sessionId: v.string(), secretKey: v.optional(v.string()) }, returns: v.object({ success: v.literal(true) }),
  handler: async (ctx, args): Promise<{ success: true }> => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHORIZED: Sign in required");
    if (!/^sess_[a-zA-Z0-9]+$/.test(args.sessionId) || args.sessionId.length > 256) throw new Error("INVALID_ARGUMENT: Invalid session");
    const secret = args.secretKey || process.env.CLERK_SECRET_KEY;
    if (!secret) throw new Error("UNAVAILABLE: Session service is not configured");
    const endpoint = `https://api.clerk.com/v1/sessions/${encodeURIComponent(args.sessionId)}`;
    const provider = async (url: string, method: string) => {
      let response: Response;
      try { response = await fetch(url, { method, headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(15_000) }); }
      catch { throw new Error("UNAVAILABLE: Session provider is unavailable"); }
      if (!response.ok) throw new Error("UNAVAILABLE: Session provider is unavailable");
      const data: unknown = await response.json().catch(() => null);
      if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("UNAVAILABLE: Invalid session response");
      return data as Record<string, unknown>;
    };
    const session = await provider(endpoint, "GET");
    if (session.id !== args.sessionId || session.user_id !== identity.subject) throw new Error("FORBIDDEN: Session does not belong to this account");
    const context = { userId: identity.subject, sessionId: args.sessionId };
    // This transaction must succeed before any provider mutation. An uncertain
    // provider result leaves a durable request for reconciliation or safe retry.
    await ctx.runMutation(internal.clerkIdentityEvents.recordManualRevocation, { ...context, phase: "requested" });
    if (session.status !== "revoked") {
      const revoked = await provider(`${endpoint}/revoke`, "POST");
      if (revoked.id !== args.sessionId || revoked.user_id !== identity.subject || revoked.status !== "revoked") throw new Error("UNAVAILABLE: Session revocation is unconfirmed");
    }
    // Internal persistence still works if the caller revoked its current session.
    await ctx.runMutation(internal.clerkIdentityEvents.recordManualRevocation, { ...context, phase: "confirmed" });
    return { success: true };
  },
});
