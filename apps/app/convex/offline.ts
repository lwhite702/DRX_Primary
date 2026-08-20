import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import type { Doc, Id } from "./_generated/dataModel";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import { calculateTaxCents } from "./helpers/money";

const paymentMethod = v.union(v.literal("cash"), v.literal("credit"));
const syncStatus = v.union(
  v.literal("committed"),
  v.literal("duplicate"),
  v.literal("quarantined"),
);
const caseKind = v.union(
  v.literal("inventory_shortfall"),
  v.literal("credit_limit_exceeded"),
  v.literal("stale_price"),
  v.literal("clock_skew"),
);

const policyFields = {
  enabled: v.boolean(),
  authorizationWindowMinutes: v.number(),
  perSaleLimitCents: v.number(),
  perDeviceSessionLimitCents: v.number(),
  offlineCreditLimitCents: v.number(),
  maxQueuedSales: v.number(),
};

const policyReturn = v.object({
  _id: v.id("offlinePolicies"),
  ...policyFields,
  version: v.number(),
  updatedAt: v.number(),
});

const authorizationReturn = v.object({
  authorizationId: v.id("offlineAuthorizations"),
  deviceId: v.string(),
  issuedAt: v.number(),
  expiresAt: v.number(),
  policyVersion: v.number(),
  perSaleLimitCents: v.number(),
  sessionLimitCents: v.number(),
  offlineCreditLimitCents: v.number(),
  maxQueuedSales: v.number(),
  collectTax: v.boolean(),
  taxRateBps: v.number(),
});

const syncReturn = v.object({
  status: syncStatus,
  submissionId: v.id("offlineSaleSubmissions"),
  saleId: v.union(v.id("sales"), v.null()),
  orderNumber: v.union(v.string(), v.null()),
  totalAmountCents: v.number(),
  conflicts: v.array(caseKind),
});

function requireOwnerOrAdmin(role: string) {
  if (role !== "OWNER" && role !== "ADMIN") {
    throw new Error("FORBIDDEN: Owner or admin role required");
  }
}

function requirePositiveInteger(value: number, field: string) {
  if (!Number.isSafeInteger(value) || value <= 0) {
    throw new Error(`INVALID_ARGUMENT: ${field} must be a positive integer`);
  }
}

export const configurePolicy = mutation({
  args: policyFields,
  returns: policyReturn,
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requireOwnerOrAdmin(auth.userRecord.role);
    requirePositiveInteger(
      args.authorizationWindowMinutes,
      "authorizationWindowMinutes",
    );
    requirePositiveInteger(args.perSaleLimitCents, "perSaleLimitCents");
    requirePositiveInteger(
      args.perDeviceSessionLimitCents,
      "perDeviceSessionLimitCents",
    );
    requirePositiveInteger(
      args.offlineCreditLimitCents,
      "offlineCreditLimitCents",
    );
    requirePositiveInteger(args.maxQueuedSales, "maxQueuedSales");
    if (args.perSaleLimitCents > args.perDeviceSessionLimitCents) {
      throw new Error(
        "INVALID_ARGUMENT: Per-sale limit cannot exceed the device-session limit",
      );
    }

    const existing = await ctx.db
      .query("offlinePolicies")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .unique();
    const now = Date.now();
    const version = (existing?.version ?? 0) + 1;
    const values = { ...args, version, updatedBy: auth.userId, updatedAt: now };
    const policyId = existing
      ? (await ctx.db.patch(existing._id, values), existing._id)
      : await ctx.db.insert("offlinePolicies", {
          businessId: auth.businessId,
          ...values,
        });

    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "OFFLINE_POLICY_CONFIGURED",
      entityType: "offline_policy",
      entityId: policyId,
      metadata: JSON.stringify({ enabled: args.enabled, version }),
      timestamp: now,
    });

    return { _id: policyId, ...args, version, updatedAt: now };
  },
});

export const getPolicy = query({
  args: {},
  returns: v.union(policyReturn, v.null()),
  handler: async (ctx) => {
    const auth = await requireUserAndBusiness(ctx);
    const policy = await ctx.db
      .query("offlinePolicies")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .unique();
    if (!policy) return null;
    return {
      _id: policy._id,
      enabled: policy.enabled,
      authorizationWindowMinutes: policy.authorizationWindowMinutes,
      perSaleLimitCents: policy.perSaleLimitCents,
      perDeviceSessionLimitCents: policy.perDeviceSessionLimitCents,
      offlineCreditLimitCents: policy.offlineCreditLimitCents,
      maxQueuedSales: policy.maxQueuedSales,
      version: policy.version,
      updatedAt: policy.updatedAt,
    };
  },
});

export const registerDevice = mutation({
  args: {
    deviceId: v.string(),
    displayName: v.optional(v.string()),
    appVersion: v.string(),
  },
  returns: v.object({
    deviceRecordId: v.id("registeredDevices"),
    status: v.union(v.literal("active"), v.literal("revoked")),
  }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requireOwnerOrAdmin(auth.userRecord.role);
    const normalizedDeviceId = args.deviceId.trim();
    if (normalizedDeviceId.length < 16 || normalizedDeviceId.length > 128) {
      throw new Error("INVALID_ARGUMENT: Invalid device identifier");
    }
    const existing = await ctx.db
      .query("registeredDevices")
      .withIndex("by_businessId_and_deviceId", (q) =>
        q.eq("businessId", auth.businessId).eq("deviceId", normalizedDeviceId),
      )
      .unique();
    const now = Date.now();
    if (existing) {
      await ctx.db.patch(existing._id, {
        displayName: args.displayName,
        appVersion: args.appVersion,
        lastSeenAt: now,
      });
      return {
        deviceRecordId: existing._id,
        status: existing.status as "active" | "revoked",
      };
    }
    const deviceRecordId = await ctx.db.insert("registeredDevices", {
      businessId: auth.businessId,
      deviceId: normalizedDeviceId,
      displayName: args.displayName,
      platform: "android",
      appVersion: args.appVersion,
      status: "active",
      registeredBy: auth.userId,
      createdAt: now,
      lastSeenAt: now,
    });
    return { deviceRecordId, status: "active" as const };
  },
});

export const issueAuthorization = mutation({
  args: { deviceId: v.string() },
  returns: authorizationReturn,
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
    const policy = await ctx.db
      .query("offlinePolicies")
      .withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      .unique();
    if (!policy?.enabled) {
      throw new Error(
        "OFFLINE_DISABLED: An owner must configure and enable offline checkout",
      );
    }
    const device = await ctx.db
      .query("registeredDevices")
      .withIndex("by_businessId_and_deviceId", (q) =>
        q.eq("businessId", auth.businessId).eq("deviceId", args.deviceId),
      )
      .unique();
    if (!device || device.status !== "active") {
      throw new Error(
        "DEVICE_NOT_AUTHORIZED: Register an active Android device first",
      );
    }
    const issuedAt = Date.now();
    const expiresAt = issuedAt + policy.authorizationWindowMinutes * 60_000;
    const authorizationId = await ctx.db.insert("offlineAuthorizations", {
      businessId: auth.businessId,
      deviceRecordId: device._id,
      deviceId: device.deviceId,
      userId: auth.userId,
      policyId: policy._id,
      policyVersion: policy.version,
      issuedAt,
      expiresAt,
      perSaleLimitCents: policy.perSaleLimitCents,
      sessionLimitCents: policy.perDeviceSessionLimitCents,
      offlineCreditLimitCents: policy.offlineCreditLimitCents,
      maxQueuedSales: policy.maxQueuedSales,
      usedCents: 0,
      usedSales: 0,
      collectTax: auth.businessRecord.collectTax,
      taxRateBps: auth.businessRecord.taxRateBps,
      status: "active",
    });
    return {
      authorizationId,
      deviceId: device.deviceId,
      issuedAt,
      expiresAt,
      policyVersion: policy.version,
      perSaleLimitCents: policy.perSaleLimitCents,
      sessionLimitCents: policy.perDeviceSessionLimitCents,
      offlineCreditLimitCents: policy.offlineCreditLimitCents,
      maxQueuedSales: policy.maxQueuedSales,
      collectTax: auth.businessRecord.collectTax,
      taxRateBps: auth.businessRecord.taxRateBps,
    };
  },
});

async function quarantine(
  ctx: MutationCtx,
  input: {
    businessId: Id<"businesses">;
    authorizationId?: Id<"offlineAuthorizations">;
    deviceId: string;
    userId: string;
    idempotencyKey: string;
    sequence: number;
    occurredAt: number;
    paymentMethod: "cash" | "credit";
    totalAmountCents: number;
    itemCount: number;
    reason: string;
  },
) {
  const submissionId = await ctx.db.insert("offlineSaleSubmissions", {
    businessId: input.businessId,
    authorizationId: input.authorizationId,
    deviceId: input.deviceId,
    userId: input.userId,
    idempotencyKey: input.idempotencyKey,
    sequence: input.sequence,
    occurredAt: input.occurredAt,
    paymentMethod: input.paymentMethod,
    totalAmountCents: input.totalAmountCents,
    itemCount: input.itemCount,
    status: "quarantined",
    quarantineReason: input.reason,
    createdAt: Date.now(),
  });
  await ctx.db.insert("auditEvents", {
    businessId: input.businessId,
    userId: input.userId,
    action: "OFFLINE_SALE_QUARANTINED",
    entityType: "offline_sale_submission",
    entityId: submissionId,
    metadata: JSON.stringify({
      reason: input.reason,
      itemCount: input.itemCount,
    }),
    timestamp: Date.now(),
  });
  return submissionId;
}

export const syncSale = mutation({
  args: {
    authorizationId: v.id("offlineAuthorizations"),
    deviceId: v.string(),
    idempotencyKey: v.string(),
    sequence: v.number(),
    occurredAt: v.number(),
    customerId: v.optional(v.id("customers")),
    customerCreditAvailableCents: v.optional(v.number()),
    items: v.array(
      v.object({
        productId: v.id("products"),
        quantityGrams: v.number(),
        unitPriceCents: v.number(),
      }),
    ),
    paymentMethod,
    amountPaidCents: v.number(),
  },
  returns: syncReturn,
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
    const duplicate = await ctx.db
      .query("offlineSaleSubmissions")
      .withIndex("by_businessId_and_idempotencyKey", (q) =>
        q
          .eq("businessId", auth.businessId)
          .eq("idempotencyKey", args.idempotencyKey),
      )
      .unique();
    if (duplicate) {
      const duplicateSale = duplicate.saleId
        ? await ctx.db.get(duplicate.saleId)
        : null;
      return {
        status:
          duplicate.status === "quarantined"
            ? ("quarantined" as const)
            : ("duplicate" as const),
        submissionId: duplicate._id,
        saleId: duplicate.saleId ?? null,
        orderNumber: duplicateSale?.orderNumber ?? null,
        totalAmountCents: duplicate.totalAmountCents,
        conflicts: [],
      };
    }

    if (args.items.length === 0 || args.items.length > 50) {
      throw new Error(
        "INVALID_ARGUMENT: Offline sale must contain 1 to 50 items",
      );
    }
    requirePositiveInteger(args.sequence, "sequence");
    if (
      !Number.isSafeInteger(args.amountPaidCents) ||
      args.amountPaidCents < 0
    ) {
      throw new Error(
        "INVALID_ARGUMENT: amountPaidCents must be a non-negative integer",
      );
    }
    let subtotalCents = 0;
    let taxableSubtotalCents = 0;
    const aggregatedItems = new Map<
      Id<"products">,
      {
        productId: Id<"products">;
        quantityGrams: number;
        unitPriceCents: number;
      }
    >();
    for (const item of args.items) {
      if (!Number.isFinite(item.quantityGrams) || item.quantityGrams <= 0) {
        throw new Error("INVALID_ARGUMENT: Item quantity must be positive");
      }
      requirePositiveInteger(item.unitPriceCents, "unitPriceCents");
      const existing = aggregatedItems.get(item.productId);
      if (existing && existing.unitPriceCents !== item.unitPriceCents) {
        throw new Error(
          "INVALID_ARGUMENT: Duplicate products must use one authorized price",
        );
      }
      aggregatedItems.set(item.productId, {
        productId: item.productId,
        quantityGrams: (existing?.quantityGrams ?? 0) + item.quantityGrams,
        unitPriceCents: item.unitPriceCents,
      });
    }
    const currentProducts: Array<{
      item: {
        productId: Id<"products">;
        quantityGrams: number;
        unitPriceCents: number;
      };
      product: Doc<"products">;
      lineTotalCents: number;
    }> = [];
    const conflictInputs: Array<{
      kind:
        | "inventory_shortfall"
        | "credit_limit_exceeded"
        | "stale_price"
        | "clock_skew";
      productId?: Id<"products">;
      customerId?: Id<"customers">;
      expectedValue?: number;
      actualValue?: number;
      summary: string;
    }> = [];
    for (const item of aggregatedItems.values()) {
      const product = await ctx.db.get(item.productId);
      if (!product || product.businessId !== auth.businessId) {
        throw new Error(
          "FORBIDDEN: Offline product is outside the active tenant",
        );
      }
      if (
        !product.allowFractionalWeight &&
        !Number.isInteger(item.quantityGrams)
      ) {
        throw new Error(
          `INVALID_ARGUMENT: Product '${product.productName}' requires a whole-unit quantity`,
        );
      }
      const lineTotalCents = Math.round(
        item.quantityGrams * item.unitPriceCents,
      );
      if (!Number.isSafeInteger(lineTotalCents) || lineTotalCents <= 0) {
        throw new Error("INVALID_ARGUMENT: Invalid offline line total");
      }
      subtotalCents += lineTotalCents;
      if (product.isTaxable !== false) {
        taxableSubtotalCents += lineTotalCents;
      }
      currentProducts.push({ item, product, lineTotalCents });
      if (product.sellingPriceCents !== item.unitPriceCents) {
        conflictInputs.push({
          kind: "stale_price",
          productId: product._id,
          expectedValue: item.unitPriceCents,
          actualValue: product.sellingPriceCents,
          summary:
            "Offline sale used an authorized cached price that changed before sync.",
        });
      }
    }

    const authorization = await ctx.db.get(args.authorizationId);
    if (authorization && authorization.businessId !== auth.businessId) {
      throw new Error(
        "FORBIDDEN: Offline authorization is outside the active tenant",
      );
    }
    const taxAmountCents = calculateTaxCents(
      taxableSubtotalCents,
      authorization?.collectTax ? authorization.taxRateBps : 0,
    );
    const totalAmountCents = subtotalCents + taxAmountCents;
    const invalidReason = !authorization
      ? "authorization_missing"
      : authorization.userId !== auth.userId ||
          authorization.deviceId !== args.deviceId
        ? "authorization_identity_mismatch"
        : authorization.status !== "active"
          ? "authorization_inactive"
          : args.occurredAt < authorization.issuedAt - 300_000 ||
              args.occurredAt > authorization.expiresAt + 300_000
            ? "authorization_time_window"
            : totalAmountCents > authorization.perSaleLimitCents
              ? "per_sale_limit_exceeded"
              : authorization.usedCents + totalAmountCents >
                  authorization.sessionLimitCents
                ? "session_limit_exceeded"
                : authorization.usedSales + 1 > authorization.maxQueuedSales
                  ? "queued_sale_limit_exceeded"
                  : args.paymentMethod === "credit" &&
                      totalAmountCents > authorization.offlineCreditLimitCents
                    ? "offline_credit_limit_exceeded"
                    : null;
    if (invalidReason) {
      const submissionId = await quarantine(ctx, {
        businessId: auth.businessId,
        authorizationId: authorization?._id,
        deviceId: args.deviceId,
        userId: auth.userId,
        idempotencyKey: args.idempotencyKey,
        sequence: args.sequence,
        occurredAt: args.occurredAt,
        paymentMethod: args.paymentMethod,
        totalAmountCents,
        itemCount: args.items.length,
        reason: invalidReason,
      });
      return {
        status: "quarantined" as const,
        submissionId,
        saleId: null,
        orderNumber: null,
        totalAmountCents,
        conflicts: [],
      };
    }

    if (
      args.paymentMethod === "cash" &&
      args.amountPaidCents < totalAmountCents
    ) {
      throw new Error(
        "PAYMENT_ERROR: Offline cash received is below the sale total",
      );
    }
    const customer = args.customerId ? await ctx.db.get(args.customerId) : null;
    if (
      args.customerId &&
      (!customer || customer.businessId !== auth.businessId)
    ) {
      throw new Error(
        "FORBIDDEN: Offline customer is outside the active tenant",
      );
    }
    if (customer && !customer.isActive) {
      throw new Error("FORBIDDEN: Offline customer account is inactive");
    }
    if (args.paymentMethod === "credit") {
      if (!customer) {
        throw new Error(
          "PAYMENT_ERROR: Offline credit requires an existing tenant customer",
        );
      }
      const currentAvailable = Math.max(
        0,
        customer.creditLimitCents - customer.totalCreditUsedCents,
      );
      if (totalAmountCents > currentAvailable) {
        conflictInputs.push({
          kind: "credit_limit_exceeded",
          customerId: customer._id,
          expectedValue: args.customerCreditAvailableCents ?? 0,
          actualValue: currentAvailable,
          summary: "Offline credit exceeded the available balance at sync.",
        });
      }
    }
    if (args.occurredAt > Date.now() + 300_000) {
      conflictInputs.push({
        kind: "clock_skew",
        expectedValue: Date.now(),
        actualValue: args.occurredAt,
        summary:
          "Offline device time was more than five minutes ahead of server time.",
      });
    }

    const now = Date.now();
    const orderNumber = `OFF-${args.idempotencyKey}`.slice(0, 50);
    const saleId = await ctx.db.insert("sales", {
      businessId: auth.businessId,
      customerId: args.customerId,
      orderNumber,
      orderStatus: "completed",
      subtotalCents,
      taxableSubtotalCents,
      taxAmountCents,
      totalAmountCents,
      amountPaidCents: args.paymentMethod === "cash" ? args.amountPaidCents : 0,
      changeAmountCents:
        args.paymentMethod === "cash"
          ? Math.max(0, args.amountPaidCents - totalAmountCents)
          : 0,
      paymentMethod: args.paymentMethod,
      createdBy: auth.userId,
      offlineAuthorizationId: args.authorizationId,
      offlineDeviceId: args.deviceId,
      occurredAt: args.occurredAt,
      createdAt: now,
      updatedAt: now,
    });

    for (const { item, product, lineTotalCents } of currentProducts) {
      const lineItemId = await ctx.db.insert("salesLineItems", {
        saleId,
        productId: item.productId,
        quantityGrams: item.quantityGrams,
        unitPriceCents: item.unitPriceCents,
        lineTotalCents,
        unitCostCents: product.unitCostCents,
        createdAt: now,
      });
      let remaining = item.quantityGrams;
      const batches = await ctx.db
        .query("inventoryBatches")
        .withIndex("by_productId_and_receivedAt", (q) =>
          q.eq("productId", item.productId),
        )
        .collect();
      for (const batch of batches) {
        if (remaining <= 0) break;
        if (
          batch.businessId !== auth.businessId ||
          batch.remainingQuantityGrams <= 0
        )
          continue;
        const allocated = Math.min(batch.remainingQuantityGrams, remaining);
        await ctx.db.patch(batch._id, {
          remainingQuantityGrams: batch.remainingQuantityGrams - allocated,
          updatedAt: now,
        });
        await ctx.db.insert("salesAllocations", {
          saleId,
          lineItemId,
          productId: item.productId,
          batchId: batch._id,
          quantityGrams: allocated,
          unitCostPerGramCents: batch.unitCostPerGramCents,
          extendedCostCents: Math.round(
            allocated * batch.unitCostPerGramCents,
          ),
          createdAt: now,
        });
        remaining -= allocated;
      }
      if (remaining > 0) {
        conflictInputs.push({
          kind: "inventory_shortfall",
          productId: product._id,
          expectedValue: item.quantityGrams,
          actualValue: item.quantityGrams - remaining,
          summary: "Offline sale exceeded FIFO inventory available at sync.",
        });
      }
      await ctx.db.patch(product._id, {
        quantityOnHandGrams: product.quantityOnHandGrams - item.quantityGrams,
        updatedAt: now,
      });
    }

    if (customer) {
      await ctx.db.patch(customer._id, {
        totalPurchasesCents: customer.totalPurchasesCents + totalAmountCents,
        totalCreditUsedCents:
          args.paymentMethod === "credit"
            ? customer.totalCreditUsedCents + totalAmountCents
            : customer.totalCreditUsedCents,
        purchaseCount: customer.purchaseCount + 1,
        updatedAt: now,
      });
    }

    const submissionId = await ctx.db.insert("offlineSaleSubmissions", {
      businessId: auth.businessId,
      authorizationId: args.authorizationId,
      deviceId: args.deviceId,
      userId: auth.userId,
      idempotencyKey: args.idempotencyKey,
      sequence: args.sequence,
      occurredAt: args.occurredAt,
      paymentMethod: args.paymentMethod,
      totalAmountCents,
      itemCount: args.items.length,
      status: "committed",
      saleId,
      createdAt: now,
    });
    await ctx.db.patch(authorization!._id, {
      usedCents: authorization!.usedCents + totalAmountCents,
      usedSales: authorization!.usedSales + 1,
    });
    for (const conflict of conflictInputs) {
      await ctx.db.insert("reconciliationCases", {
        businessId: auth.businessId,
        saleId,
        ...conflict,
        status: "open",
        createdBy: auth.userId,
        createdAt: now,
      });
    }
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "OFFLINE_SALE_SYNCED",
      entityType: "sale",
      entityId: saleId,
      metadata: JSON.stringify({
        submissionId,
        paymentMethod: args.paymentMethod,
        itemCount: args.items.length,
        conflictKinds: conflictInputs.map((conflict) => conflict.kind),
      }),
      timestamp: now,
    });
    return {
      status: "committed" as const,
      submissionId,
      saleId,
      orderNumber,
      totalAmountCents,
      conflicts: conflictInputs.map((conflict) => conflict.kind),
    };
  },
});

export const listReconciliationCases = query({
  args: {
    status: v.optional(v.union(v.literal("open"), v.literal("resolved"))),
  },
  returns: v.array(
    v.object({
      _id: v.id("reconciliationCases"),
      saleId: v.id("sales"),
      kind: caseKind,
      status: v.union(v.literal("open"), v.literal("resolved")),
      summary: v.string(),
      expectedValue: v.optional(v.number()),
      actualValue: v.optional(v.number()),
      createdAt: v.number(),
      resolvedAt: v.optional(v.number()),
    }),
  ),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requireOwnerOrAdmin(auth.userRecord.role);
    const rows = await ctx.db
      .query("reconciliationCases")
      .withIndex("by_businessId_and_status", (q) =>
        args.status
          ? q.eq("businessId", auth.businessId).eq("status", args.status)
          : q.eq("businessId", auth.businessId),
      )
      .order("desc")
      .take(100);
    return rows.map((row) => ({
      _id: row._id,
      saleId: row.saleId,
      kind: row.kind,
      status: row.status,
      summary: row.summary,
      expectedValue: row.expectedValue,
      actualValue: row.actualValue,
      createdAt: row.createdAt,
      resolvedAt: row.resolvedAt,
    }));
  },
});

export const resolveReconciliationCase = mutation({
  args: { caseId: v.id("reconciliationCases"), resolutionReason: v.string() },
  returns: v.object({
    caseId: v.id("reconciliationCases"),
    status: v.literal("resolved"),
  }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requireOwnerOrAdmin(auth.userRecord.role);
    const row = await ctx.db.get(args.caseId);
    if (!row || row.businessId !== auth.businessId) {
      throw new Error("NOT_FOUND: Reconciliation case not found");
    }
    const reason = args.resolutionReason.trim();
    if (reason.length < 4 || reason.length > 500) {
      throw new Error(
        "INVALID_ARGUMENT: Resolution reason must be 4 to 500 characters",
      );
    }
    const now = Date.now();
    await ctx.db.patch(row._id, {
      status: "resolved",
      resolvedBy: auth.userId,
      resolutionReason: reason,
      resolvedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "OFFLINE_RECONCILIATION_RESOLVED",
      entityType: "reconciliation_case",
      entityId: row._id,
      metadata: JSON.stringify({ kind: row.kind, saleId: row.saleId }),
      timestamp: now,
    });
    return { caseId: row._id, status: "resolved" as const };
  },
});
