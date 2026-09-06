import { v } from "convex/values";
import {
  internalAction,
  internalMutation,
  mutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requireUserAndBusiness } from "./helpers/auth";
import {
  decryptPushToken,
  encryptPushToken,
  hashPushToken,
  type PushTokenIdentity,
} from "./helpers/pushCrypto";

const platformValidator = v.union(v.literal("ios"), v.literal("android"));
const providerValidator = v.union(
  v.literal("apns"),
  v.literal("expo"),
  v.literal("fcm"),
);

type Platform = "ios" | "android";
type Provider = "apns" | "expo" | "fcm";
const DISPATCH_LEASE_MS = 2 * 60_000;

function validateProviderPlatform(platform: Platform, provider: Provider): void {
  const valid =
    provider === "expo" ||
    (platform === "ios" && provider === "apns") ||
    (platform === "android" && provider === "fcm");
  if (!valid) {
    throw new Error("INVALID_ARGUMENT: provider is not valid for platform");
  }
}

function normalizeDeviceId(value: string): string {
  const deviceId = value.trim();
  if (!deviceId || deviceId.length > 128) {
    throw new Error(
      "INVALID_ARGUMENT: deviceId must be between 1 and 128 characters",
    );
  }
  return deviceId;
}

function normalizeToken(value: string): string {
  const token = value.trim();
  if (token.length < 10 || token.length > 4_096) {
    throw new Error(
      "INVALID_ARGUMENT: token must be between 10 and 4096 characters",
    );
  }
  return token;
}

function tokenIdentity(input: {
  businessId: string;
  userId: string;
  deviceId: string;
  provider: Provider;
}): PushTokenIdentity {
  return input;
}

export const registerDeviceToken = mutation({
  args: {
    deviceId: v.string(),
    platform: platformValidator,
    provider: providerValidator,
    token: v.string(),
  },
  returns: v.object({
    deviceTokenId: v.id("devicePushTokens"),
    status: v.literal("active"),
  }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    const deviceId = normalizeDeviceId(args.deviceId);
    const token = normalizeToken(args.token);
    validateProviderPlatform(args.platform, args.provider);
    const identity = tokenIdentity({
      businessId: String(auth.businessId),
      userId: auth.userId,
      deviceId,
      provider: args.provider,
    });
    const [encrypted, tokenHash] = await Promise.all([
      encryptPushToken(token, identity),
      hashPushToken(token),
    ]);
    const existing = await ctx.db
      .query("devicePushTokens")
      .withIndex("by_businessId_and_userId_and_deviceId_and_provider", (q) =>
        q
          .eq("businessId", auth.businessId)
          .eq("userId", auth.userId)
          .eq("deviceId", deviceId)
          .eq("provider", args.provider),
      )
      .unique();
    const now = Date.now();
    const priorBindings = await ctx.db
      .query("devicePushTokens")
      .withIndex("by_provider_and_tokenHash", (q) =>
        q.eq("provider", args.provider).eq("tokenHash", tokenHash),
      )
      .take(20);
    for (const priorBinding of priorBindings) {
      if (priorBinding._id !== existing?._id && priorBinding.status === "active") {
        await ctx.db.patch(priorBinding._id, {
          status: "revoked",
          revokedAt: now,
          updatedAt: now,
        });
      }
    }
    let deviceTokenId;
    if (existing) {
      deviceTokenId = existing._id;
      await ctx.db.patch(existing._id, {
        platform: args.platform,
        tokenEncrypted: encrypted.ciphertext,
        tokenEncryptionVersion: encrypted.version,
        tokenHash,
        status: "active",
        revokedAt: undefined,
        updatedAt: now,
      });
    } else {
      deviceTokenId = await ctx.db.insert("devicePushTokens", {
        businessId: auth.businessId,
        userId: auth.userId,
        deviceId,
        platform: args.platform,
        provider: args.provider,
        tokenEncrypted: encrypted.ciphertext,
        tokenEncryptionVersion: encrypted.version,
        tokenHash,
        status: "active",
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "DEVICE_PUSH_TOKEN_REGISTERED",
      entityType: "device_push_token",
      entityId: deviceTokenId,
      metadata: JSON.stringify({
        platform: args.platform,
        provider: args.provider,
      }),
      timestamp: now,
    });
    return { deviceTokenId, status: "active" as const };
  },
});

export const unregisterDeviceToken = mutation({
  args: { deviceId: v.string(), provider: providerValidator },
  returns: v.object({ revokedCount: v.number() }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    const deviceId = normalizeDeviceId(args.deviceId);
    const existing = await ctx.db
      .query("devicePushTokens")
      .withIndex("by_businessId_and_userId_and_deviceId_and_provider", (q) =>
        q
          .eq("businessId", auth.businessId)
          .eq("userId", auth.userId)
          .eq("deviceId", deviceId)
          .eq("provider", args.provider),
      )
      .unique();
    if (!existing || existing.status === "revoked") {
      return { revokedCount: 0 };
    }
    const now = Date.now();
    await ctx.db.patch(existing._id, {
      status: "revoked",
      revokedAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "DEVICE_PUSH_TOKEN_REVOKED",
      entityType: "device_push_token",
      entityId: existing._id,
      metadata: JSON.stringify({ provider: args.provider }),
      timestamp: now,
    });
    return { revokedCount: 1 };
  },
});

export const acknowledgeDeliveryPush = mutation({
  args: { outboxId: v.id("deliveryPushOutbox") },
  returns: v.object({
    outboxId: v.id("deliveryPushOutbox"),
    acknowledgedAt: v.number(),
  }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    const outbox = await ctx.db.get(args.outboxId);
    if (
      !outbox ||
      outbox.businessId !== auth.businessId ||
      outbox.targetUserId !== auth.userId
    ) {
      throw new Error("NOT_FOUND: Delivery push not found");
    }
    if (outbox.acknowledgedAt !== undefined) {
      return { outboxId: outbox._id, acknowledgedAt: outbox.acknowledgedAt };
    }
    const acknowledgedAt = Date.now();
    await ctx.db.patch(outbox._id, { acknowledgedAt, updatedAt: acknowledgedAt });
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "DELIVERY_PUSH_ACKNOWLEDGED",
      entityType: "delivery_push_outbox",
      entityId: outbox._id,
      metadata: JSON.stringify({
        notificationId: outbox.notificationId,
        deliveryId: outbox.deliveryId,
      }),
      timestamp: acknowledgedAt,
    });
    return { outboxId: outbox._id, acknowledgedAt };
  },
});

const claimedOutbox = v.union(
  v.null(),
  v.object({
    outboxId: v.id("deliveryPushOutbox"),
    provider: providerValidator,
    tokenEncrypted: v.string(),
    tokenBusinessId: v.string(),
    tokenUserId: v.string(),
    tokenDeviceId: v.string(),
    payloadJson: v.string(),
  }),
);

export const claimOutbox = internalMutation({
  args: { outboxId: v.id("deliveryPushOutbox") },
  returns: claimedOutbox,
  handler: async (ctx, args) => {
    const outbox = await ctx.db.get(args.outboxId);
    if (
      !outbox ||
      (outbox.status !== "queued" && outbox.status !== "retry_scheduled") ||
      outbox.nextAttemptAt > Date.now()
    ) {
      return null;
    }
    const [notification, delivery] = await Promise.all([
      ctx.db.get(outbox.notificationId),
      ctx.db.get(outbox.deliveryId),
    ]);
    let payloadType: string | null = null;
    try {
      payloadType = (JSON.parse(outbox.payloadJson) as { type?: unknown }).type as
        | string
        | null;
    } catch {
      payloadType = null;
    }
    let targetIsCurrent = false;
    if (
      notification &&
      delivery &&
      notification.businessId === outbox.businessId &&
      notification.deliveryId === delivery._id &&
      notification.targetUserId === outbox.targetUserId
    ) {
      if (payloadType === "delivery_reminder_canceled") {
        targetIsCurrent = notification.acknowledgedAt !== undefined;
      } else if (notification.acknowledgedAt === undefined) {
        targetIsCurrent = delivery.assignedToUserId === outbox.targetUserId;
        if (
          !targetIsCurrent &&
          (notification.kind === "manager_escalation" ||
            delivery.assignedToUserId === undefined)
        ) {
          const manager = await ctx.db
            .query("users")
            .withIndex("by_clerkUserId_and_businessId", (q) =>
              q.eq("clerkUserId", outbox.targetUserId).eq("businessId", outbox.businessId),
            )
            .unique();
          targetIsCurrent = Boolean(
            manager &&
              manager.businessId === outbox.businessId &&
              manager.status === "ACTIVE" &&
              (manager.role === "OWNER" || manager.role === "ADMIN"),
          );
        }
      }
    }
    if (!targetIsCurrent) {
      await ctx.db.patch(outbox._id, {
        status: "canceled",
        lastErrorCode: "STALE_NOTIFICATION_TARGET",
        leaseExpiresAt: undefined,
        updatedAt: Date.now(),
      });
      return null;
    }
    const deviceToken = await ctx.db.get(outbox.deviceTokenId);
    if (
      !deviceToken ||
      deviceToken.businessId !== outbox.businessId ||
      deviceToken.userId !== outbox.targetUserId ||
      deviceToken.status !== "active"
    ) {
      await ctx.db.patch(outbox._id, {
        status: "dead_letter",
        lastErrorCode: "DEVICE_TOKEN_INACTIVE",
        updatedAt: Date.now(),
      });
      return null;
    }
    const leaseExpiresAt = Date.now() + DISPATCH_LEASE_MS;
    await ctx.db.patch(outbox._id, {
      status: "dispatching",
      attempts: outbox.attempts + 1,
      leaseExpiresAt,
      updatedAt: Date.now(),
    });
    await ctx.scheduler.runAt(leaseExpiresAt, internal.push.recoverDispatchLease, {
      outboxId: outbox._id,
      expectedLeaseExpiresAt: leaseExpiresAt,
    });
    return {
      outboxId: outbox._id,
      provider: outbox.provider,
      tokenEncrypted: deviceToken.tokenEncrypted,
      tokenBusinessId: String(deviceToken.businessId),
      tokenUserId: deviceToken.userId,
      tokenDeviceId: deviceToken.deviceId,
      payloadJson: outbox.payloadJson,
    };
  },
});

export const recordDispatchResult = internalMutation({
  args: {
    outboxId: v.id("deliveryPushOutbox"),
    success: v.boolean(),
    retryable: v.boolean(),
    errorCode: v.optional(v.string()),
    providerMessageId: v.optional(v.string()),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const outbox = await ctx.db.get(args.outboxId);
    if (!outbox || outbox.status !== "dispatching") return null;
    const now = Date.now();
    if (args.success) {
      await ctx.db.patch(outbox._id, {
        status: "sent",
        providerMessageId: args.providerMessageId,
        lastErrorCode: undefined,
        leaseExpiresAt: undefined,
        sentAt: now,
        updatedAt: now,
      });
      return null;
    }
    const shouldRetry = args.retryable && outbox.attempts < 5;
    if (!shouldRetry) {
      await ctx.db.patch(outbox._id, {
        status: "dead_letter",
        lastErrorCode: args.errorCode ?? "DISPATCH_FAILED",
        leaseExpiresAt: undefined,
        updatedAt: now,
      });
      return null;
    }
    const delayMinutes = [1, 5, 15, 60][Math.min(outbox.attempts - 1, 3)];
    const nextAttemptAt = now + delayMinutes * 60_000;
    await ctx.db.patch(outbox._id, {
      status: "retry_scheduled",
      lastErrorCode: args.errorCode ?? "DISPATCH_FAILED",
      nextAttemptAt,
      leaseExpiresAt: undefined,
      updatedAt: now,
    });
    await ctx.scheduler.runAt(nextAttemptAt, internal.push.dispatchOutbox, {
      outboxId: outbox._id,
    });
    return null;
  },
});

export const recoverDispatchLease = internalMutation({
  args: {
    outboxId: v.id("deliveryPushOutbox"),
    expectedLeaseExpiresAt: v.number(),
  },
  returns: v.null(),
  handler: async (ctx, args) => {
    const outbox = await ctx.db.get(args.outboxId);
    if (
      !outbox ||
      outbox.status !== "dispatching" ||
      outbox.leaseExpiresAt !== args.expectedLeaseExpiresAt ||
      args.expectedLeaseExpiresAt > Date.now()
    ) {
      return null;
    }
    const now = Date.now();
    if (outbox.attempts >= 5) {
      await ctx.db.patch(outbox._id, {
        status: "dead_letter",
        lastErrorCode: "DISPATCH_LEASE_EXPIRED",
        leaseExpiresAt: undefined,
        updatedAt: now,
      });
      return null;
    }
    await ctx.db.patch(outbox._id, {
      status: "retry_scheduled",
      lastErrorCode: "DISPATCH_LEASE_EXPIRED",
      leaseExpiresAt: undefined,
      nextAttemptAt: now,
      updatedAt: now,
    });
    await ctx.scheduler.runAfter(0, internal.push.dispatchOutbox, {
      outboxId: outbox._id,
    });
    return null;
  },
});

type PushPayload = {
  type: "delivery_reminder";
  outboxId: string;
  notificationId: string;
  deliveryId: string;
  kind: string;
  scheduledFor: number;
  route: "deliveries";
};

async function sendPush(
  provider: Provider,
  token: string,
  payload: PushPayload,
): Promise<{ providerMessageId?: string }> {
  let url: string;
  let headers: Record<string, string> = { "content-type": "application/json" };
  let body: unknown;
  if (provider === "expo") {
    url =
      process.env.DRX_EXPO_PUSH_URL?.trim() ||
      "https://exp.host/--/api/v2/push/send";
    body = {
      to: token,
      title: "Delivery reminder",
      body: "A delivery needs your attention.",
      channelId: "delivery-reminders",
      data: payload,
    };
  } else if (provider === "apns") {
    const endpoint = process.env.DRX_APNS_PUSH_URL?.trim();
    const authorization = process.env.DRX_APNS_AUTHORIZATION?.trim();
    if (!endpoint || !authorization) throw new Error("CONFIGURATION_MISSING");
    url = endpoint.replace("{token}", encodeURIComponent(token));
    headers = { ...headers, authorization };
    body = {
      aps: {
        alert: {
          title: "Delivery reminder",
          body: "A delivery needs your attention.",
        },
        sound: "default",
      },
      ...payload,
    };
  } else {
    const endpoint = process.env.DRX_FCM_PUSH_URL?.trim();
    const authorization = process.env.DRX_FCM_AUTHORIZATION?.trim();
    if (!endpoint || !authorization) throw new Error("CONFIGURATION_MISSING");
    url = endpoint;
    headers = { ...headers, authorization };
    body = {
      message: {
        token,
        notification: {
          title: "Delivery reminder",
          body: "A delivery needs your attention.",
        },
        android: { notification: { channel_id: "delivery-reminders" } },
        data: Object.fromEntries(
          Object.entries(payload).map(([key, value]) => [key, String(value)]),
        ),
      },
    };
  }
  const response = await fetch(url, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = new Error(`HTTP_${response.status}`);
    Object.assign(error, { retryable: response.status === 429 || response.status >= 500 });
    throw error;
  }
  const responseBody = (await response.json().catch(() => ({}))) as Record<
    string,
    unknown
  >;
  let providerMessageId: string | undefined;
  if (provider === "expo") {
    const data = responseBody.data;
    const ticket = Array.isArray(data)
      ? (data[0] as Record<string, unknown> | undefined)
      : (data as Record<string, unknown> | undefined);
    if (ticket && typeof ticket === "object") {
      if (ticket.status === "error") {
        const message =
          typeof ticket.message === "string"
            ? ticket.message
            : "EXPO_TICKET_ERROR";
        const details = ticket.details as Record<string, unknown> | undefined;
        const errorCode =
          typeof details?.error === "string" ? details.error : message;
        const retryable =
          errorCode === "RateLimitExceeded" || errorCode === "ServerSideError";
        const error = new Error(`EXPO_${errorCode}`);
        Object.assign(error, { retryable, errorCode });
        throw error;
      }
      if (typeof ticket.id === "string") {
        providerMessageId = ticket.id;
      }
    }
  } else {
    providerMessageId =
      typeof responseBody.id === "string"
        ? responseBody.id
        : typeof responseBody.name === "string"
          ? responseBody.name
          : undefined;
  }
  return { providerMessageId };
}

export const dispatchOutbox = internalAction({
  args: { outboxId: v.id("deliveryPushOutbox") },
  returns: v.null(),
  handler: async (ctx, args) => {
    const claimed = await ctx.runMutation(internal.push.claimOutbox, args);
    if (!claimed) return null;
    try {
      const payload = JSON.parse(claimed.payloadJson) as PushPayload;
      const token = await decryptPushToken(
        claimed.tokenEncrypted,
        tokenIdentity({
          businessId: claimed.tokenBusinessId,
          userId: claimed.tokenUserId,
          deviceId: claimed.tokenDeviceId,
          provider: claimed.provider,
        }),
      );
      const result = await sendPush(claimed.provider, token, payload);
      await ctx.runMutation(internal.push.recordDispatchResult, {
        outboxId: claimed.outboxId,
        success: true,
        retryable: false,
        providerMessageId: result.providerMessageId,
      });
    } catch (error) {
      const errorCode =
        error instanceof Error && /^[A-Z0-9_]+$/.test(error.message)
          ? error.message
          : "NETWORK_ERROR";
      const retryable =
        errorCode !== "CONFIGURATION_MISSING" &&
        (typeof error === "object" && error !== null && "retryable" in error
          ? Boolean((error as { retryable?: unknown }).retryable)
          : true);
      await ctx.runMutation(internal.push.recordDispatchResult, {
        outboxId: claimed.outboxId,
        success: false,
        retryable,
        errorCode,
      });
    }
    return null;
  },
});
