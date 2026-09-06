import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Businesses / Tenants
  businesses: defineTable({
    isActive: v.optional(v.boolean()),
    clerkOrgId: v.optional(v.string()),
    legacyPrismaBusinessId: v.optional(v.string()),
    name: v.string(),
    businessType: v.optional(v.string()),
    ownerId: v.string(), // clerkUserId or user id
    currency: v.string(), // e.g. "USD"
    timezone: v.string(),
    collectTax: v.boolean(),
    taxRateBps: v.number(), // Integer basis points (e.g., 825 for 8.25%)
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkOrgId", ["clerkOrgId"])
    .index("by_legacyPrismaBusinessId", ["legacyPrismaBusinessId"])
    .index("by_ownerId", ["ownerId"]),

  // Business Settings
  businessSettings: defineTable({
    businessId: v.id("businesses"),
    posManagerPin: v.optional(v.string()),
    themePreference: v.optional(v.string()),
    settingsData: v.optional(v.string()), // JSON configuration
    loyaltyCombinationPolicy: v.optional(
      v.union(v.literal("stack"), v.literal("best_only")),
    ),
    loyaltyTiers: v.optional(
      v.array(
        v.object({
          name: v.string(),
          minimumSpendCents: v.number(),
          discountRateBps: v.number(),
        }),
      ),
    ),
    deliveryFeeTaxable: v.optional(v.boolean()),
    deliveryDispatchSlaMinutes: v.optional(v.number()),
    deliveryManagerEscalationMinutes: v.optional(v.number()),
    deliveryManagerNotificationUserIds: v.optional(v.array(v.string())),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_businessId", ["businessId"]),

  // Users & Memberships
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    role: v.string(), // Native roles or migrated tenant role names
    permissions: v.optional(v.record(v.string(), v.boolean())),
    businessId: v.id("businesses"),
    status: v.string(), // "ACTIVE" | "INVITED" | "SUSPENDED"
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerkUserId", ["clerkUserId"])
    .index("by_businessId", ["businessId"])
    .index("by_email", ["email"]),

  // Member Invites
  invites: defineTable({
    businessId: v.id("businesses"),
    email: v.string(),
    token: v.string(),
    role: v.string(), // "ADMIN" | "MEMBER"
    status: v.string(), // "PENDING" | "ACCEPTED" | "EXPIRED"
    invitedBy: v.string(),
    expiresAt: v.number(),
    createdAt: v.number(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_token", ["token"])
    .index("by_email", ["email"]),

  // Product Categories
  categories: defineTable({
    businessId: v.id("businesses"),
    name: v.string(),
    description: v.optional(v.string()),
    color: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_businessId_and_name", ["businessId", "name"]),

  // Products Catalog
  products: defineTable({
    businessId: v.id("businesses"),
    legacyPrismaId: v.optional(v.string()),
    sku: v.string(),
    productName: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    sellingPriceCents: v.number(), // Integer cents
    unitCostCents: v.number(), // Integer cents
    isTaxable: v.optional(v.boolean()),
    quantityOnHandGrams: v.number(), // Weight in grams or unit count
    reorderLevelGrams: v.number(),
    allowFractionalWeight: v.boolean(),
    sellingUnit: v.optional(v.string()),
    quantityPrecision: v.optional(v.number()),
    minimumSaleQuantity: v.optional(v.number()),
    quantityIncrement: v.optional(v.number()),
    suggestedQuantityPresets: v.optional(v.array(v.number())),
    suggestedDollarPresetsCents: v.optional(v.array(v.number())),
    bulkPriceTiers: v.optional(
      v.array(
        v.object({
          minimumQuantity: v.number(),
          unitPriceCents: v.number(),
        }),
      ),
    ),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_businessId_and_isActive", ["businessId", "isActive"])
    .index("by_businessId_and_legacyPrismaId", [
      "businessId",
      "legacyPrismaId",
    ])
    .index("by_businessId_and_sku", ["businessId", "sku"]),

  manualLinePolicies: defineTable({
    businessId: v.id("businesses"),
    nameKey: v.string(),
    name: v.string(),
    isTaxable: v.boolean(),
    unitCostCents: v.optional(v.number()),
    isActive: v.boolean(),
    updatedBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_businessId_and_nameKey", ["businessId", "nameKey"]),

  // Inventory Intakes
  inventoryIntakes: defineTable({
    businessId: v.id("businesses"),
    productId: v.id("products"),
    totalCostCents: v.number(),
    totalWeightGrams: v.number(),
    calculatedCostPerGramCents: v.number(), // Scaled integer or integer cents
    deliveryCostCents: v.number(),
    supplier: v.optional(v.string()),
    status: v.string(), // "approved" | "pending" | "rejected"
    requiresApproval: v.optional(v.boolean()),
    approvedBy: v.optional(v.string()),
    approvedAt: v.optional(v.number()),
    rejectionReason: v.optional(v.string()),
    batchId: v.optional(v.id("inventoryBatches")),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_productId", ["productId"])
    .index("by_businessId_and_status", ["businessId", "status"])
    .index("by_businessId_and_productId_and_status_and_createdAt", [
      "businessId", "productId", "status", "createdAt",
    ]),

  // Inventory Batches (FIFO tracking)
  inventoryBatches: defineTable({
    businessId: v.id("businesses"),
    productId: v.id("products"),
    intakeId: v.optional(v.id("inventoryIntakes")),
    originalQuantityGrams: v.number(),
    remainingQuantityGrams: v.number(),
    unitCostPerGramCents: v.number(),
    supplier: v.optional(v.string()),
    receivedAt: v.number(),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_productId", ["productId"])
    .index("by_productId_and_receivedAt", ["productId", "receivedAt"]),

  // Customers
  customers: defineTable({
    businessId: v.id("businesses"),
    legacyPrismaId: v.optional(v.string()),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    totalPurchasesCents: v.number(),
    loyaltyEligibleSpendCents: v.optional(v.number()),
    totalCreditUsedCents: v.number(),
    creditLimitCents: v.number(),
    creditEnabled: v.optional(v.boolean()),
    purchaseCount: v.number(),
    loyaltyTier: v.string(),
    discountRateBps: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_businessId_and_legacyPrismaId", [
      "businessId",
      "legacyPrismaId",
    ])
    .index("by_businessId_and_isActive", ["businessId", "isActive"])
    .index("by_businessId_and_isActive_and_creditEnabled", ["businessId", "isActive", "creditEnabled"])
    .index("by_businessId_and_phone", ["businessId", "phoneNumber"]),

  // Append-only balance changes. Opening entries preserve the pre-ledger
  // aggregate explicitly; historical source reconciliation remains a migration gate.
  creditAccounts: defineTable({
    businessId: v.id("businesses"), customerId: v.id("customers"),
    balanceCents: v.number(), createdAt: v.number(), updatedAt: v.number(),
  }).index("by_customerId", ["customerId"]),
  creditRequestCancellations: defineTable({
    businessId: v.id("businesses"), customerId: v.id("customers"),
    requestKey: v.string(), createdBy: v.string(), createdAt: v.number(),
  }).index("by_businessId_and_requestKey", ["businessId", "requestKey"]),
  creditEntries: defineTable({
    businessId: v.id("businesses"), customerId: v.id("customers"),
    kind: v.union(v.literal("opening"), v.literal("issue"), v.literal("payment"), v.literal("sale")),
    deltaCents: v.number(), balanceAfterCents: v.number(),
    saleId: v.optional(v.id("sales")), requestKey: v.optional(v.string()),
    description: v.optional(v.string()), dueAt: v.optional(v.number()),
    openingSource: v.optional(v.literal("existing_customer_balance_unreconciled")),
    createdBy: v.string(), createdAt: v.number(),
  }).index("by_businessId_and_requestKey", ["businessId", "requestKey"])
    .index("by_businessId", ["businessId"])
    .index("by_customerId", ["customerId"])
    .index("by_saleId", ["saleId"]),

  // Rebuildable credit projections; immutable creditEntries remain authoritative.
  creditAllocationState: defineTable({
    businessId: v.id("businesses"), customerId: v.id("customers"),
    cursor: v.union(v.string(), v.null()), status: v.union(v.literal("pending"), v.literal("ready")),
    outstandingCents: v.number(), pendingPaymentId: v.optional(v.id("creditEntries")),
    pendingPaymentCents: v.optional(v.number()), lastEntryId: v.optional(v.id("creditEntries")),
    lastPaymentAt: v.optional(v.number()), updatedAt: v.number(),
  }).index("by_customerId", ["customerId"]),
  creditDebts: defineTable({
    businessId: v.id("businesses"), customerId: v.id("customers"), entryId: v.id("creditEntries"),
    principalCents: v.number(), remainingCents: v.number(), dueAt: v.optional(v.number()),
    unreconciled: v.boolean(), status: v.union(v.literal("open"), v.literal("paid")),
    createdAt: v.number(),
  }).index("by_customerId_and_status", ["customerId", "status"])
    .index("by_entryId", ["entryId"]),
  creditPaymentAllocations: defineTable({
    businessId: v.id("businesses"), customerId: v.id("customers"),
    paymentEntryId: v.id("creditEntries"), debtEntryId: v.id("creditEntries"),
    amountCents: v.number(), policy: v.literal("fifo_creation_v1"), createdAt: v.number(),
  }).index("by_paymentEntryId", ["paymentEntryId"])
    .index("by_debtEntryId", ["debtEntryId"]),

  // Sales Orders (Financial Ledger)
  sales: defineTable({
    businessId: v.id("businesses"),
    customerId: v.optional(v.id("customers")),
    orderNumber: v.string(),
    orderStatus: v.string(), // "completed" | "pending" | "cancelled" | "refunded"
    subtotalCents: v.number(),
    merchandiseSubtotalCents: v.optional(v.number()),
    discountCents: v.optional(v.number()),
    merchandiseRevenueCents: v.optional(v.number()),
    deliveryRevenueCents: v.optional(v.number()),
    vendorDeliveryExpenseCents: v.optional(v.number()),
    deliveryTaxCents: v.optional(v.number()),
    merchandiseTaxCents: v.optional(v.number()),
    loyaltyEligibleSpendCents: v.optional(v.number()),
    cogsCents: v.optional(v.number()),
    taxableSubtotalCents: v.optional(v.number()),
    taxAmountCents: v.number(),
    totalAmountCents: v.number(),
    amountPaidCents: v.number(),
    changeAmountCents: v.number(),
    paymentMethod: v.string(), // "cash" | "card" | "credit"
    paymentReference: v.optional(v.string()),
    fees: v.optional(v.array(v.object({ type: v.string(), amountCents: v.number(), value: v.optional(v.string()) }))),
    feeRevenueCents: v.optional(v.number()),
    creditAmountCents: v.optional(v.number()),
    vendorDeliveryExpenseKnown: v.optional(v.boolean()),
    checkoutFingerprint: v.optional(v.string()),
    createdBy: v.string(),
    offlineAuthorizationId: v.optional(v.id("offlineAuthorizations")),
    offlineDeviceId: v.optional(v.string()),
    occurredAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_businessId_and_orderStatus_and_createdAt", [
      "businessId",
      "orderStatus",
      "createdAt",
    ])
    .index("by_businessId_and_orderNumber", ["businessId", "orderNumber"])
    .index("by_customerId", ["customerId"]),

  // Sales Line Items
  salesLineItems: defineTable({
    saleId: v.id("sales"),
    productId: v.optional(v.id("products")),
    source: v.optional(
      v.union(v.literal("inventory"), v.literal("manual")),
    ),
    manualLineId: v.optional(v.string()),
    manualName: v.optional(v.string()),
    isTaxable: v.optional(v.boolean()),
    manualPolicyId: v.optional(v.id("manualLinePolicies")),
    manualCostKnown: v.optional(v.boolean()),
    quantityGrams: v.number(),
    unitPriceCents: v.number(),
    lineTotalCents: v.number(),
    priceOverrideReason: v.optional(v.string()),
    catalogUnitPriceCents: v.optional(v.number()),
    baseUnitPriceCents: v.optional(v.number()),
    baseLineTotalCents: v.optional(v.number()),
    bulkDiscountCents: v.optional(v.number()),
    loyaltyDiscountCents: v.optional(v.number()),
    unitCostCents: v.number(),
    createdAt: v.number(),
  }).index("by_saleId", ["saleId"]),

  // Sales Batch Allocations (FIFO Cost Accounting)
  salesAllocations: defineTable({
    saleId: v.id("sales"),
    lineItemId: v.id("salesLineItems"),
    productId: v.id("products"),
    batchId: v.id("inventoryBatches"),
    quantityGrams: v.number(),
    unitCostPerGramCents: v.number(),
    extendedCostCents: v.number(),
    createdAt: v.number(),
  })
    .index("by_saleId", ["saleId"])
    .index("by_lineItemId", ["lineItemId"])
    .index("by_batchId", ["batchId"]),

  deliveryProfiles: defineTable({
    businessId: v.id("businesses"), legacyPrismaId: v.optional(v.string()),
    name: v.string(), provider: v.optional(v.string()), basePriceCents: v.number(),
    vendorFeeCents: v.optional(v.number()), allowPriceOverride: v.boolean(), isActive: v.boolean(),
    createdAt: v.number(), updatedAt: v.number(),
  }).index("by_businessId_and_isActive", ["businessId", "isActive"])
    .index("by_businessId_and_legacyPrismaId", ["businessId", "legacyPrismaId"]),

  // Delivery fulfillment is linked to an immutable completed sale. Customer
  // addresses are always encrypted before this record is persisted.
  deliveries: defineTable({
    businessId: v.id("businesses"),
    saleId: v.id("sales"),
    customerId: v.optional(v.id("customers")),
    profileId: v.optional(v.id("deliveryProfiles")),
    vendorExpenseKnown: v.optional(v.boolean()),
    assignedToUserId: v.optional(v.string()),
    addressEncrypted: v.string(),
    addressEncryptionVersion: v.number(),
    vendorFeeCents: v.number(),
    customerFeeCents: v.number(),
    deliveryTaxCents: v.number(),
    chargeCustomer: v.boolean(),
    status: v.union(
      v.literal("ready_for_dispatch"),
      v.literal("uber_ordered"),
      v.literal("handed_off"),
      v.literal("delivered"),
      v.literal("canceled"),
    ),
    dispatchDueAt: v.number(),
    estimatedArrivalAt: v.optional(v.number()),
    handedOffAt: v.optional(v.number()),
    deliveredAt: v.optional(v.number()),
    canceledAt: v.optional(v.number()),
    cancellationReason: v.optional(v.string()),
    createdBy: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_saleId", ["saleId"])
    .index("by_businessId", ["businessId"])
    .index("by_businessId_and_status", ["businessId", "status"]),

  deliveryEvents: defineTable({
    businessId: v.id("businesses"),
    deliveryId: v.id("deliveries"),
    actorUserId: v.string(),
    type: v.union(
      v.literal("created"),
      v.literal("assigned"),
      v.literal("status_changed"),
      v.literal("reminder_emitted"),
      v.literal("financial_adjustment_recorded"),
      v.literal("address_accessed"),
    ),
    fromStatus: v.optional(v.string()),
    toStatus: v.optional(v.string()),
    metadata: v.string(),
    createdAt: v.number(),
  })
    .index("by_deliveryId", ["deliveryId"])
    .index("by_businessId", ["businessId"]),

  deliveryFinancialAdjustments: defineTable({
    businessId: v.id("businesses"),
    deliveryId: v.id("deliveries"),
    saleId: v.id("sales"),
    kind: v.union(
      v.literal("customer_fee_refund"),
      v.literal("vendor_credit"),
      v.literal("delivery_tax_refund"),
    ),
    idempotencyKey: v.string(),
    amountCents: v.number(),
    reason: v.string(),
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_deliveryId", ["deliveryId"])
    .index("by_deliveryId_and_idempotencyKey", [
      "deliveryId",
      "idempotencyKey",
    ])
    .index("by_businessId", ["businessId"])
    .index("by_businessId_and_createdAt", ["businessId", "createdAt"]),

  deliveryNotifications: defineTable({
    businessId: v.id("businesses"),
    deliveryId: v.id("deliveries"),
    targetUserId: v.optional(v.string()),
    targetRole: v.optional(v.literal("manager")),
    kind: v.union(
      v.literal("dispatch_overdue"),
      v.literal("eta_warning"),
      v.literal("eta_due"),
      v.literal("overdue"),
      v.literal("manager_escalation"),
      v.literal("assignment_handoff"),
    ),
    message: v.string(),
    scheduledFor: v.number(),
    createdAt: v.number(),
    acknowledgedAt: v.optional(v.number()),
  })
    .index("by_deliveryId", ["deliveryId"])
    .index("by_businessId", ["businessId"])
    .index("by_businessId_and_targetUserId_and_acknowledgedAt", [
      "businessId",
      "targetUserId",
      "acknowledgedAt",
    ])
    .index("by_businessId_and_targetRole_and_acknowledgedAt", [
      "businessId",
      "targetRole",
      "acknowledgedAt",
    ])
    .index("by_deliveryId_and_targetUserId_and_acknowledgedAt", [
      "deliveryId",
      "targetUserId",
      "acknowledgedAt",
    ]),

  devicePushTokens: defineTable({
    businessId: v.id("businesses"),
    userId: v.string(),
    deviceId: v.string(),
    platform: v.union(v.literal("ios"), v.literal("android")),
    provider: v.union(
      v.literal("apns"),
      v.literal("expo"),
      v.literal("fcm"),
    ),
    tokenEncrypted: v.string(),
    tokenEncryptionVersion: v.number(),
    tokenHash: v.string(),
    status: v.union(v.literal("active"), v.literal("revoked")),
    createdAt: v.number(),
    updatedAt: v.number(),
    revokedAt: v.optional(v.number()),
  })
    .index("by_businessId_and_userId_and_deviceId_and_provider", [
      "businessId",
      "userId",
      "deviceId",
      "provider",
    ])
    .index("by_businessId_and_userId_and_status", [
      "businessId",
      "userId",
      "status",
    ])
    .index("by_provider_and_tokenHash", ["provider", "tokenHash"]),

  deliveryPushOutbox: defineTable({
    businessId: v.id("businesses"),
    notificationId: v.id("deliveryNotifications"),
    deliveryId: v.id("deliveries"),
    deviceTokenId: v.id("devicePushTokens"),
    targetUserId: v.string(),
    provider: v.union(
      v.literal("apns"),
      v.literal("expo"),
      v.literal("fcm"),
    ),
    payloadJson: v.string(),
    status: v.union(
      v.literal("queued"),
      v.literal("dispatching"),
      v.literal("sent"),
      v.literal("retry_scheduled"),
      v.literal("dead_letter"),
      v.literal("canceled"),
    ),
    attempts: v.number(),
    nextAttemptAt: v.number(),
    lastErrorCode: v.optional(v.string()),
    providerMessageId: v.optional(v.string()),
    acknowledgedAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
    sentAt: v.optional(v.number()),
    leaseExpiresAt: v.optional(v.number()),
  })
    .index("by_businessId_and_targetUserId", [
      "businessId",
      "targetUserId",
    ])
    .index("by_status_and_nextAttemptAt", ["status", "nextAttemptAt"])
    .index("by_notificationId", ["notificationId"])
    .index("by_deviceTokenId", ["deviceTokenId"]),

  // Immutable Audit Events
  auditEvents: defineTable({
    businessId: v.id("businesses"),
    userId: v.string(),
    action: v.string(),
    entityType: v.string(),
    entityId: v.string(),
    metadata: v.string(), // JSON serialized metadata
    timestamp: v.number(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_businessId_and_timestamp", ["businessId", "timestamp"])
    .index("by_businessId_and_entityType_and_timestamp", ["businessId", "entityType", "timestamp"]),

  // Idempotency Registry
  idempotencyKeys: defineTable({
    businessId: v.id("businesses"),
    key: v.string(),
    action: v.string(),
    resultJson: v.string(),
    createdAt: v.number(),
  }).index("by_businessId_and_key", ["businessId", "key"]),

  // Owner-controlled offline checkout policy. There is deliberately no
  // application fallback: offline checkout stays disabled until an owner
  // configures every risk limit.
  offlinePolicies: defineTable({
    businessId: v.id("businesses"),
    enabled: v.boolean(),
    authorizationWindowMinutes: v.number(),
    perSaleLimitCents: v.number(),
    perDeviceSessionLimitCents: v.number(),
    offlineCreditLimitCents: v.number(),
    maxQueuedSales: v.number(),
    version: v.number(),
    updatedBy: v.string(),
    updatedAt: v.number(),
  }).index("by_businessId", ["businessId"]),

  registeredDevices: defineTable({
    businessId: v.id("businesses"),
    deviceId: v.string(),
    displayName: v.optional(v.string()),
    platform: v.literal("android"),
    appVersion: v.string(),
    status: v.union(v.literal("active"), v.literal("revoked")),
    registeredBy: v.string(),
    createdAt: v.number(),
    lastSeenAt: v.number(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_businessId_and_deviceId", ["businessId", "deviceId"]),

  offlineAuthorizations: defineTable({
    businessId: v.id("businesses"),
    deviceRecordId: v.id("registeredDevices"),
    deviceId: v.string(),
    userId: v.string(),
    policyId: v.id("offlinePolicies"),
    policyVersion: v.number(),
    issuedAt: v.number(),
    expiresAt: v.number(),
    perSaleLimitCents: v.number(),
    sessionLimitCents: v.number(),
    offlineCreditLimitCents: v.number(),
    maxQueuedSales: v.number(),
    usedCents: v.number(),
    usedSales: v.number(),
    collectTax: v.boolean(),
    taxRateBps: v.number(),
    status: v.union(
      v.literal("active"),
      v.literal("revoked"),
      v.literal("expired"),
    ),
  })
    .index("by_businessId", ["businessId"])
    .index("by_businessId_and_deviceId", ["businessId", "deviceId"])
    .index("by_businessId_and_userId", ["businessId", "userId"]),

  offlineSaleSubmissions: defineTable({
    businessId: v.id("businesses"),
    authorizationId: v.optional(v.id("offlineAuthorizations")),
    deviceId: v.string(),
    userId: v.string(),
    idempotencyKey: v.string(),
    sequence: v.number(),
    occurredAt: v.number(),
    paymentMethod: v.union(v.literal("cash"), v.literal("credit")),
    totalAmountCents: v.number(),
    itemCount: v.number(),
    status: v.union(v.literal("committed"), v.literal("quarantined")),
    saleId: v.optional(v.id("sales")),
    quarantineReason: v.optional(v.string()),
    createdAt: v.number(),
  })
    .index("by_businessId_and_idempotencyKey", ["businessId", "idempotencyKey"])
    .index("by_businessId_and_status", ["businessId", "status"]),

  reconciliationCases: defineTable({
    businessId: v.id("businesses"),
    saleId: v.id("sales"),
    kind: v.union(
      v.literal("inventory_shortfall"),
      v.literal("credit_limit_exceeded"),
      v.literal("stale_price"),
      v.literal("clock_skew"),
    ),
    status: v.union(v.literal("open"), v.literal("resolved")),
    productId: v.optional(v.id("products")),
    customerId: v.optional(v.id("customers")),
    expectedValue: v.optional(v.number()),
    actualValue: v.optional(v.number()),
    summary: v.string(),
    createdBy: v.string(),
    resolvedBy: v.optional(v.string()),
    resolutionReason: v.optional(v.string()),
    createdAt: v.number(),
    resolvedAt: v.optional(v.number()),
  })
    .index("by_businessId_and_status", ["businessId", "status"])
    .index("by_saleId", ["saleId"]),
});
