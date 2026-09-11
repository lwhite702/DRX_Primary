import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { loadPrivacyPolicy } from "./helpers/businessPreferences";
import { canWritePrivacyField } from "../lib/privacy/profiles";

export const createCustomer = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    creditLimitCents: v.optional(v.number()),
    creditEnabled: v.optional(v.boolean()),
  },
  returns: v.id("customers"),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_CUSTOMERS");
    if (args.creditLimitCents !== undefined && (!Number.isSafeInteger(args.creditLimitCents) || args.creditLimitCents < 0)) throw new Error("INVALID_ARGUMENT: Credit limit must be nonnegative integer cents");
    const { protocol } = await loadPrivacyPolicy(ctx, auth.businessId);
    for (const [input, field] of [[args.firstName, "first_name"], [args.lastName, "first_name"], [args.phoneNumber, "phone"], [args.email, "email"]] as const) {
      if (input?.trim() && !canWritePrivacyField(protocol, field)) throw new Error("FORBIDDEN: Customer field is disabled by the business privacy policy");
    }
    const now = Date.now();

    const customerId = await ctx.db.insert("customers", {
      businessId: auth.businessId,
      firstName: args.firstName,
      lastName: args.lastName,
      phoneNumber: args.phoneNumber,
      email: args.email,
      totalPurchasesCents: 0,
      loyaltyEligibleSpendCents: 0,
      totalCreditUsedCents: 0,
      creditLimitCents: args.creditLimitCents || 0,
      creditEnabled: args.creditEnabled,
      creditPolicyRevision: 0,
      purchaseCount: 0,
      loyaltyTier: "standard",
      discountRateBps: 0,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "CUSTOMER_REGISTERED",
      entityType: "customer",
      entityId: customerId,
      metadata: JSON.stringify({
        fieldsProvided: ["firstName", "lastName", "phoneNumber", "email"].filter(field => Boolean(args[field as "firstName" | "lastName" | "phoneNumber" | "email"]?.trim())),
      }),
      timestamp: now,
    });

    return customerId;
  },
});

export const linkLegacyPrismaCustomer = mutation({
  args: {
    customerId: v.id("customers"),
    legacyPrismaId: v.string(),
  },
  returns: v.object({
    customerId: v.id("customers"),
    legacyPrismaId: v.string(),
  }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_CUSTOMERS");
    const customer = await ctx.db.get(args.customerId);
    if (!customer || customer.businessId !== auth.businessId) {
      throw new Error(`NOT_FOUND: Customer '${args.customerId}' not found`);
    }
    if (!auth.businessRecord.legacyPrismaBusinessId) {
      throw new Error(
        "INVALID_STATE: Link the legacy Prisma business before linking a customer",
      );
    }
    const legacyPrismaId = args.legacyPrismaId.trim();
    if (!legacyPrismaId || legacyPrismaId.length > 128) {
      throw new Error(
        "INVALID_ARGUMENT: legacyPrismaId must be between 1 and 128 characters",
      );
    }
    if (customer.legacyPrismaId && customer.legacyPrismaId !== legacyPrismaId) {
      throw new Error(
        `CONFLICT: Customer is already linked to legacy Prisma customer '${customer.legacyPrismaId}'`,
      );
    }
    const duplicate = await ctx.db
      .query("customers")
      .withIndex("by_businessId_and_legacyPrismaId", (q) =>
        q
          .eq("businessId", auth.businessId)
          .eq("legacyPrismaId", legacyPrismaId),
      )
      .unique();
    if (duplicate && duplicate._id !== customer._id) {
      throw new Error(
        "CONFLICT: Legacy Prisma customer identity is already linked in this business",
      );
    }
    if (!customer.legacyPrismaId) {
      const now = Date.now();
      await ctx.db.patch(customer._id, { legacyPrismaId, updatedAt: now });
      await ctx.db.insert("auditEvents", {
        businessId: auth.businessId,
        userId: auth.userId,
        action: "LEGACY_PRISMA_CUSTOMER_LINKED",
        entityType: "customer",
        entityId: customer._id,
        metadata: JSON.stringify({ mappingAdded: true }),
        timestamp: now,
      });
    }
    return { customerId: customer._id, legacyPrismaId };
  },
});

export const listCustomers = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireUserAndBusiness(ctx);
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    return customers;
  },
});
