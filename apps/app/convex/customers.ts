import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { requireSelectedBusiness, requireUserAndBusiness } from "./helpers/auth";
import { hasPermission, requirePermission } from "./helpers/permissions";
import { loadPrivacyPolicy } from "./helpers/businessPreferences";
import { canWritePrivacyField } from "../lib/privacy/profiles";

const nullableString = v.union(v.string(), v.null());
const nullableNumber = v.union(v.number(), v.null());
const operationalFields = {
  aliasEncrypted: nullableString,
  firstNameEncrypted: nullableString,
  phoneEncrypted: nullableString,
  emailEncrypted: nullableString,
  addressEncrypted: nullableString,
  notesEncrypted: nullableString,
  aliasHash: nullableString,
  phoneHash: nullableString,
  emailHash: nullableString,
  piiEncryptionVersion: v.number(),
  lastName: nullableString,
  city: nullableString,
  state: nullableString,
  zipCode: nullableString,
  customerType: v.string(),
  fixedPricePerGramCents: nullableNumber,
  ephemeral: v.boolean(),
  ephemeralExpiresAt: nullableNumber,
  isActive: v.boolean(),
};

function optionalString(value: string | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function optionalNumber(value: number | null): number | undefined {
  return value === null ? undefined : value;
}

function requireCents(value: number | null, label: string): void {
  if (value !== null && (!Number.isSafeInteger(value) || value < 0)) {
    throw new Error(`INVALID_ARGUMENT: ${label} must be nonnegative integer cents`);
  }
}

function requireTimestamp(value: number | null, label: string): void {
  if (value !== null && (!Number.isSafeInteger(value) || value < 0 || !Number.isFinite(new Date(value).getTime()))) {
    throw new Error(`INVALID_ARGUMENT: ${label} is invalid`);
  }
}

async function selectedCustomer(ctx: QueryCtx | MutationCtx, businessId: Id<"businesses">, customerId: string) {
  const normalized = ctx.db.normalizeId("customers", customerId);
  const customer = normalized
    ? await ctx.db.get(normalized)
    : await ctx.db.query("customers").withIndex("by_businessId_and_legacyPrismaId", q => q.eq("businessId", businessId).eq("legacyPrismaId", customerId)).unique();
  if (!customer || customer.businessId !== businessId) throw new Error("NOT_FOUND: Customer not found");
  return customer;
}

async function duplicateForHashes(ctx: QueryCtx | MutationCtx, businessId: Id<"businesses">, phoneHash: string | null, emailHash: string | null, excluding?: Id<"customers">) {
  const candidates = [] as Array<Doc<"customers"> | null>;
  if (phoneHash) candidates.push(await ctx.db.query("customers").withIndex("by_businessId_and_phoneHash", q => q.eq("businessId", businessId).eq("phoneHash", phoneHash)).first());
  if (emailHash) candidates.push(await ctx.db.query("customers").withIndex("by_businessId_and_emailHash", q => q.eq("businessId", businessId).eq("emailHash", emailHash)).first());
  return candidates.find(candidate => candidate && candidate._id !== excluding) ?? null;
}

async function enforceOperationalPrivacy(ctx: QueryCtx | MutationCtx, businessId: Id<"businesses">, args: typeof operationalFields extends never ? never : {
  aliasEncrypted: string | null; firstNameEncrypted: string | null; phoneEncrypted: string | null; emailEncrypted: string | null;
  addressEncrypted: string | null; notesEncrypted: string | null; lastName: string | null; city: string | null; state: string | null; zipCode: string | null;
}) {
  const { protocol } = await loadPrivacyPolicy(ctx, businessId);
  const checks = [
    [args.aliasEncrypted, "alias"], [args.firstNameEncrypted, "first_name"], [args.lastName, "first_name"],
    [args.phoneEncrypted, "phone"], [args.emailEncrypted, "email"],
    [args.addressEncrypted || args.city || args.state || args.zipCode, "address"], [args.notesEncrypted, "notes"],
  ] as const;
  for (const [value, field] of checks) {
    if (value && !canWritePrivacyField(protocol, field)) throw new Error(`FORBIDDEN: Customer field '${field}' is disabled by the business privacy policy`);
  }
}

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

export const listOperational = query({
  args: {
    businessId: v.string(),
    expectedUserId: v.string(),
    isActive: v.boolean(),
    windowSize: v.number(),
  },
  returns: v.array(v.any()),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, args.isActive ? "VIEW_CUSTOMERS" : "MANAGE_CUSTOMERS");
    if (!Number.isSafeInteger(args.windowSize) || args.windowSize < 1 || args.windowSize > 2000) {
      throw new Error("INVALID_ARGUMENT: Customer result window must be between 1 and 2000");
    }
    return ctx.db
      .query("customers")
      .withIndex("by_businessId_and_isActive_and_createdAt", q => q.eq("businessId", auth.businessId).eq("isActive", args.isActive))
      .order("desc")
      .take(args.windowSize);
  },
});

export const getOperational = query({
  args: { businessId: v.string(), expectedUserId: v.string(), customerId: v.string() },
  returns: v.object({ customer: v.any(), metrics: v.any(), transactionHistory: v.array(v.any()) }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "VIEW_CUSTOMERS");
    const customer = await selectedCustomer(ctx, auth.businessId, args.customerId);
    if (!customer.isActive && !hasPermission(auth.userRecord, "MANAGE_CUSTOMERS")) throw new Error("FORBIDDEN: Access denied");

    const sales = await ctx.db.query("sales").withIndex("by_customerId", q => q.eq("customerId", customer._id)).order("desc").take(5001);
    const entries = await ctx.db.query("creditEntries").withIndex("by_customerId", q => q.eq("customerId", customer._id)).order("desc").take(5001);
    if (sales.length > 5000 || entries.length > 5000) throw new Error("CAPACITY_EXCEEDED: Customer history needs a larger projection");
    if (sales.some(sale => sale.businessId !== auth.businessId) || entries.some(entry => entry.businessId !== auth.businessId)) throw new Error("INVALID_STATE: Customer history ownership requires reconciliation");

    const now = Date.now();
    const day = 24 * 60 * 60 * 1000;
    let sales30dCents = 0, sales90dCents = 0, salesAllTimeCents = 0, creditIssued30dCents = 0, creditIssued90dCents = 0;
    for (const sale of sales) {
      if (sale.orderStatus !== "completed") continue;
      if (!Number.isSafeInteger(sale.totalAmountCents) || sale.totalAmountCents < 0) throw new Error("INVALID_STATE: Sale amount requires reconciliation");
      const occurredAt = sale.occurredAt ?? sale.createdAt;
      salesAllTimeCents += sale.totalAmountCents;
      if (occurredAt >= now - 30 * day) sales30dCents += sale.totalAmountCents;
      if (occurredAt >= now - 90 * day) sales90dCents += sale.totalAmountCents;
    }
    for (const entry of entries) {
      if ((entry.kind !== "issue" && entry.kind !== "sale") || entry.deltaCents <= 0) continue;
      if (!Number.isSafeInteger(entry.deltaCents)) throw new Error("INVALID_STATE: Credit amount requires reconciliation");
      if (entry.createdAt >= now - 30 * day) creditIssued30dCents += entry.deltaCents;
      if (entry.createdAt >= now - 90 * day) creditIssued90dCents += entry.deltaCents;
    }
    const money = (cents: number) => cents / 100;
    return {
      customer,
      metrics: {
        sales_30d: money(sales30dCents), sales_90d: money(sales90dCents), sales_all_time: money(salesAllTimeCents),
        credit_issued_30d: money(creditIssued30dCents), credit_issued_90d: money(creditIssued90dCents),
        current_credit_balance: money(customer.totalCreditUsedCents), on_time_repayment_ratio: null, late_payment_count: 0,
      },
      transactionHistory: sales.slice(0, 50).map(sale => ({
        id: sale._id, order_number: sale.orderNumber, status: sale.orderStatus,
        subtotal: money(sale.subtotalCents), tax_amount: money(sale.taxAmountCents), total_amount: money(sale.totalAmountCents),
        payment_method: sale.paymentMethod, created_by: sale.createdBy, created_at: new Date(sale.occurredAt ?? sale.createdAt).toISOString(),
      })),
    };
  },
});

export const createOperational = mutation({
  args: {
    businessId: v.string(), expectedUserId: v.string(), ...operationalFields,
    creditLimitCents: v.number(), changedFields: v.array(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_CUSTOMERS");
    requireCents(args.creditLimitCents, "Credit limit");
    requireCents(args.fixedPricePerGramCents, "Fixed price per gram");
    requireTimestamp(args.ephemeralExpiresAt, "Ephemeral expiration");
    await enforceOperationalPrivacy(ctx, auth.businessId, args);
    const duplicate = await duplicateForHashes(ctx, auth.businessId, args.phoneHash, args.emailHash);
    if (duplicate) throw new Error(`CONFLICT: ${duplicate._id}`);
    const now = Date.now();
    const customerId = await ctx.db.insert("customers", {
      businessId: auth.businessId,
      aliasEncrypted: optionalString(args.aliasEncrypted), firstNameEncrypted: optionalString(args.firstNameEncrypted),
      phoneEncrypted: optionalString(args.phoneEncrypted), emailEncrypted: optionalString(args.emailEncrypted),
      addressEncrypted: optionalString(args.addressEncrypted), notesEncrypted: optionalString(args.notesEncrypted),
      aliasHash: optionalString(args.aliasHash), phoneHash: optionalString(args.phoneHash), emailHash: optionalString(args.emailHash),
      piiEncryptionVersion: args.piiEncryptionVersion, lastName: optionalString(args.lastName), city: optionalString(args.city),
      state: optionalString(args.state), zipCode: optionalString(args.zipCode), customerType: args.customerType,
      fixedPricePerGramCents: optionalNumber(args.fixedPricePerGramCents), ephemeral: args.ephemeral,
      ephemeralExpiresAt: optionalNumber(args.ephemeralExpiresAt), lastActivityAt: now,
      totalPurchasesCents: 0, loyaltyEligibleSpendCents: 0, totalCreditUsedCents: 0,
      creditLimitCents: args.creditLimitCents, creditEnabled: true, creditPolicyRevision: 0,
      purchaseCount: 0, loyaltyTier: "standard", discountRateBps: 0, isActive: args.isActive,
      createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "CUSTOMER_REGISTERED", entityType: "customer", entityId: customerId, metadata: JSON.stringify({ changedFields: args.changedFields, isActive: args.isActive, ephemeral: args.ephemeral, customerType: args.customerType }), timestamp: now });
    const customer = await ctx.db.get(customerId);
    if (!customer) throw new Error("INVALID_STATE: Customer was not created");
    return customer;
  },
});

export const createOrAttachOperational = mutation({
  args: {
    businessId: v.string(), expectedUserId: v.string(), matchBy: v.union(v.literal("phone"), v.literal("alias")), ...operationalFields,
    creditLimitCents: v.number(), changedFields: v.array(v.string()),
  },
  returns: v.object({ created: v.boolean(), customer: v.any() }),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_CUSTOMERS");
    requireCents(args.creditLimitCents, "Credit limit");
    requireCents(args.fixedPricePerGramCents, "Fixed price per gram");
    requireTimestamp(args.ephemeralExpiresAt, "Ephemeral expiration");
    await enforceOperationalPrivacy(ctx, auth.businessId, args);
    const matchHash = args.matchBy === "phone" ? args.phoneHash : args.aliasHash;
    if (!matchHash) throw new Error("INVALID_ARGUMENT: Customer lookup identity is required");
    const existing = args.matchBy === "phone"
      ? await ctx.db.query("customers").withIndex("by_businessId_and_phoneHash", q => q.eq("businessId", auth.businessId).eq("phoneHash", matchHash)).first()
      : await ctx.db.query("customers").withIndex("by_businessId_and_aliasHash", q => q.eq("businessId", auth.businessId).eq("aliasHash", matchHash)).first();
    if (existing?.isActive) return { created: false, customer: existing };
    const now = Date.now();
    const customerId = await ctx.db.insert("customers", {
      businessId: auth.businessId,
      aliasEncrypted: optionalString(args.aliasEncrypted), firstNameEncrypted: optionalString(args.firstNameEncrypted),
      phoneEncrypted: optionalString(args.phoneEncrypted), emailEncrypted: optionalString(args.emailEncrypted),
      addressEncrypted: optionalString(args.addressEncrypted), notesEncrypted: optionalString(args.notesEncrypted),
      aliasHash: optionalString(args.aliasHash), phoneHash: optionalString(args.phoneHash), emailHash: optionalString(args.emailHash),
      piiEncryptionVersion: args.piiEncryptionVersion, lastName: optionalString(args.lastName), city: optionalString(args.city), state: optionalString(args.state), zipCode: optionalString(args.zipCode),
      customerType: args.customerType, fixedPricePerGramCents: optionalNumber(args.fixedPricePerGramCents),
      ephemeral: args.ephemeral, ephemeralExpiresAt: optionalNumber(args.ephemeralExpiresAt), lastActivityAt: now,
      totalPurchasesCents: 0, loyaltyEligibleSpendCents: 0, totalCreditUsedCents: 0,
      creditLimitCents: args.creditLimitCents, creditEnabled: true, creditPolicyRevision: 0,
      purchaseCount: 0, loyaltyTier: "standard", discountRateBps: 0, isActive: args.isActive, createdAt: now, updatedAt: now,
    });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "CUSTOMER_REGISTERED", entityType: "customer", entityId: customerId, metadata: JSON.stringify({ changedFields: args.changedFields, source: args.matchBy === "phone" ? "pos_quick_create" : "credit_account" }), timestamp: now });
    const customer = await ctx.db.get(customerId);
    if (!customer) throw new Error("INVALID_STATE: Customer was not created");
    return { created: true, customer };
  },
});

export const updateOperational = mutation({
  args: {
    businessId: v.string(), expectedUserId: v.string(), customerId: v.string(), ...operationalFields,
    creditLimitCents: v.number(), changedFields: v.array(v.string()),
  },
  returns: v.any(),
  handler: async (ctx, args) => {
    const auth = await requireSelectedBusiness(ctx, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_CUSTOMERS");
    const customer = await selectedCustomer(ctx, auth.businessId, args.customerId);
    requireCents(args.creditLimitCents, "Credit limit");
    requireCents(args.fixedPricePerGramCents, "Fixed price per gram");
    requireTimestamp(args.ephemeralExpiresAt, "Ephemeral expiration");
    await enforceOperationalPrivacy(ctx, auth.businessId, args);
    const duplicate = await duplicateForHashes(ctx, auth.businessId, args.phoneHash, args.emailHash, customer._id);
    if (duplicate) throw new Error(`CONFLICT: ${duplicate._id}`);
    const now = Date.now();
    await ctx.db.patch(customer._id, {
      alias: undefined, firstName: undefined, phoneNumber: undefined, email: undefined, address: undefined, notes: undefined,
      aliasEncrypted: optionalString(args.aliasEncrypted), firstNameEncrypted: optionalString(args.firstNameEncrypted),
      phoneEncrypted: optionalString(args.phoneEncrypted), emailEncrypted: optionalString(args.emailEncrypted),
      addressEncrypted: optionalString(args.addressEncrypted), notesEncrypted: optionalString(args.notesEncrypted),
      aliasHash: optionalString(args.aliasHash), phoneHash: optionalString(args.phoneHash), emailHash: optionalString(args.emailHash),
      piiEncryptionVersion: args.piiEncryptionVersion, lastName: optionalString(args.lastName), city: optionalString(args.city), state: optionalString(args.state), zipCode: optionalString(args.zipCode),
      customerType: args.customerType, fixedPricePerGramCents: optionalNumber(args.fixedPricePerGramCents),
      ephemeral: args.ephemeral, ephemeralExpiresAt: optionalNumber(args.ephemeralExpiresAt), isActive: args.isActive,
      creditLimitCents: args.creditLimitCents, lastActivityAt: now, updatedAt: now,
    });
    await ctx.db.insert("auditEvents", { businessId: auth.businessId, userId: auth.userId, action: "CUSTOMER_UPDATED", entityType: "customer", entityId: customer._id, metadata: JSON.stringify({ changedFields: args.changedFields }), timestamp: now });
    const updated = await ctx.db.get(customer._id);
    if (!updated) throw new Error("INVALID_STATE: Customer was not updated");
    return updated;
  },
});

export const listCustomers = query({
  args: {},
  handler: async (ctx) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "VIEW_CUSTOMERS");
    const customers = await ctx.db
      .query("customers")
      .withIndex("by_businessId_and_isActive", (q) => q.eq("businessId", auth.businessId).eq("isActive", true))
      .take(500);

    return customers;
  },
});
