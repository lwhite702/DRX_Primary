import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import schema from "./schema";
import { configuredPin, publicSettingsData, saveBusinessPreferences } from "./helpers/businessPreferences";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission, hasPermission } from "./helpers/permissions";

export const getBusinessSettings = query({
  args: {},
  returns: v.object({
    business: v.object({ ...schema.tables.businesses.validator.fields, _id: v.id("businesses"), _creationTime: v.number() }),
    settings: v.union(v.null(), v.object({ ...schema.tables.businessSettings.validator.fields, _id: v.id("businessSettings"), _creationTime: v.number() })),
  }),
  handler: async (ctx) => {
    const auth = await requireUserAndBusiness(ctx);
    const settings = await ctx.db
      .query("businessSettings")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .unique();

    return {
      business: auth.businessRecord,
      settings: settings
        ? {
            ...settings,
            posManagerPin: configuredPin(settings) ? "••••" : undefined,
            settingsData: publicSettingsData(settings),
          }
        : null,
    };
  },
});

export const linkLegacyPrismaBusiness = mutation({
  args: { legacyPrismaBusinessId: v.string() },
  returns: v.object({
    businessId: v.id("businesses"),
    legacyPrismaBusinessId: v.string(),
  }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_COMMERCE_SETTINGS");
    const legacyPrismaBusinessId = args.legacyPrismaBusinessId.trim();
    if (!legacyPrismaBusinessId || legacyPrismaBusinessId.length > 128) {
      throw new Error(
        "INVALID_ARGUMENT: legacyPrismaBusinessId must be between 1 and 128 characters",
      );
    }
    if (
      auth.businessRecord.legacyPrismaBusinessId &&
      auth.businessRecord.legacyPrismaBusinessId !== legacyPrismaBusinessId
    ) {
      throw new Error(
        `CONFLICT: Business is already linked to legacy Prisma business '${auth.businessRecord.legacyPrismaBusinessId}'`,
      );
    }
    const duplicate = await ctx.db
      .query("businesses")
      .withIndex("by_legacyPrismaBusinessId", (q) =>
        q.eq("legacyPrismaBusinessId", legacyPrismaBusinessId),
      )
      .unique();
    if (duplicate && duplicate._id !== auth.businessId) {
      throw new Error(
        "CONFLICT: Legacy Prisma business identity is already linked",
      );
    }
    if (!auth.businessRecord.legacyPrismaBusinessId) {
      const now = Date.now();
      await ctx.db.patch(auth.businessId, {
        legacyPrismaBusinessId,
        updatedAt: now,
      });
      await ctx.db.insert("auditEvents", {
        businessId: auth.businessId,
        userId: auth.userId,
        action: "LEGACY_PRISMA_BUSINESS_LINKED",
        entityType: "business",
        entityId: auth.businessId,
        metadata: JSON.stringify({ mappingAdded: true }),
        timestamp: now,
      });
    }
    return { businessId: auth.businessId, legacyPrismaBusinessId };
  },
});

export const updateBusinessSettings = mutation({
  args: {
    name: v.optional(v.string()),
    taxRateBps: v.optional(v.number()),
    collectTax: v.optional(v.boolean()),
    posManagerPin: v.optional(v.string()),
    themePreference: v.optional(v.string()),
  },
  returns: v.object({ success: v.literal(true) }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    await saveBusinessPreferences(ctx, auth, args);
    return { success: true as const };
  },
});

export const updateCommerceSettings = mutation({
  args: {
    loyaltyCombinationPolicy: v.union(
      v.literal("stack"),
      v.literal("best_only"),
    ),
    loyaltyTiers: v.array(
      v.object({
        name: v.string(),
        minimumSpendCents: v.number(),
        discountRateBps: v.number(),
      }),
    ),
    deliveryFeeTaxable: v.boolean(),
    deliveryDispatchSlaMinutes: v.number(),
    deliveryManagerEscalationMinutes: v.number(),
    deliveryManagerNotificationUserIds: v.array(v.string()),
  },
  returns: v.object({ success: v.literal(true) }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_COMMERCE_SETTINGS");
    const requirePositiveInteger = (value: number, field: string) => {
      if (!Number.isSafeInteger(value) || value <= 0) {
        throw new Error(`INVALID_ARGUMENT: ${field} must be a positive integer`);
      }
    };
    requirePositiveInteger(
      args.deliveryDispatchSlaMinutes,
      "deliveryDispatchSlaMinutes",
    );
    requirePositiveInteger(
      args.deliveryManagerEscalationMinutes,
      "deliveryManagerEscalationMinutes",
    );
    let previousMinimum = -1;
    const loyaltyTiers = args.loyaltyTiers.map((tier) => ({
      ...tier,
      name: tier.name.trim(),
    }));
    for (const tier of loyaltyTiers) {
      const name = tier.name.trim();
      if (!name || name.length > 80) {
        throw new Error("INVALID_ARGUMENT: Loyalty tier names must be between 1 and 80 characters");
      }
      if (
        !Number.isSafeInteger(tier.minimumSpendCents) ||
        tier.minimumSpendCents < 0 ||
        tier.minimumSpendCents <= previousMinimum
      ) {
        throw new Error("INVALID_ARGUMENT: Loyalty tiers must have ascending, unique spend thresholds");
      }
      if (
        !Number.isSafeInteger(tier.discountRateBps) ||
        tier.discountRateBps < 0 ||
        tier.discountRateBps > 10_000
      ) {
        throw new Error("INVALID_ARGUMENT: Loyalty discount rate must be between 0 and 10000 basis points");
      }
      previousMinimum = tier.minimumSpendCents;
    }
    const managerIds = [
      ...new Set(
        args.deliveryManagerNotificationUserIds
          .map((value) => value.trim())
          .filter(Boolean),
      ),
    ];
    for (const userId of managerIds) {
      const user = await ctx.db
        .query("users")
        .withIndex("by_clerkUserId_and_businessId", (q) => q.eq("clerkUserId", userId).eq("businessId", auth.businessId))
        .unique();
      if (
        !user ||
        user.businessId !== auth.businessId ||
        user.status !== "ACTIVE" ||
        !hasPermission(user, "MANAGE_COMMERCE_SETTINGS")
      ) {
        throw new Error(`INVALID_ARGUMENT: Manager notification user '${userId}' is not an active tenant manager`);
      }
    }
    const existing = await ctx.db
      .query("businessSettings")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .unique();
    const now = Date.now();
    const values = {
      loyaltyCombinationPolicy: args.loyaltyCombinationPolicy,
      loyaltyTiers,
      deliveryFeeTaxable: args.deliveryFeeTaxable,
      deliveryDispatchSlaMinutes: args.deliveryDispatchSlaMinutes,
      deliveryManagerEscalationMinutes:
        args.deliveryManagerEscalationMinutes,
      deliveryManagerNotificationUserIds: managerIds,
      updatedAt: now,
    };
    if (existing) {
      await ctx.db.patch(existing._id, values);
    } else {
      await ctx.db.insert("businessSettings", {
        businessId: auth.businessId,
        ...values,
        createdAt: now,
      });
    }
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "COMMERCE_SETTINGS_UPDATED",
      entityType: "business_settings",
      entityId: existing?._id ?? auth.businessId,
      metadata: JSON.stringify({
        loyaltyTierCount: args.loyaltyTiers.length,
        deliveryFeeTaxable: args.deliveryFeeTaxable,
      }),
      timestamp: now,
    });
    return { success: true as const };
  },
});
