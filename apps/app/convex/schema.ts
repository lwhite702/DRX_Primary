import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // Businesses / Tenants
  businesses: defineTable({
    clerkOrgId: v.optional(v.string()),
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
    .index("by_ownerId", ["ownerId"]),

  // Business Settings
  businessSettings: defineTable({
    businessId: v.id("businesses"),
    posManagerPin: v.optional(v.string()),
    themePreference: v.optional(v.string()),
    settingsData: v.optional(v.string()), // JSON configuration
    createdAt: v.number(),
    updatedAt: v.number(),
  }).index("by_businessId", ["businessId"]),

  // Users & Memberships
  users: defineTable({
    clerkUserId: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    role: v.string(), // "OWNER" | "ADMIN" | "MEMBER"
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
    sku: v.string(),
    productName: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    sellingPriceCents: v.number(), // Integer cents
    unitCostCents: v.number(), // Integer cents
    quantityOnHandGrams: v.number(), // Weight in grams or unit count
    reorderLevelGrams: v.number(),
    allowFractionalWeight: v.boolean(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_businessId_and_sku", ["businessId", "sku"]),

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
    createdBy: v.string(),
    createdAt: v.number(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_productId", ["productId"]),

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
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    phoneNumber: v.optional(v.string()),
    email: v.optional(v.string()),
    totalPurchasesCents: v.number(),
    totalCreditUsedCents: v.number(),
    creditLimitCents: v.number(),
    purchaseCount: v.number(),
    loyaltyTier: v.string(),
    discountRateBps: v.number(),
    isActive: v.boolean(),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_businessId_and_phone", ["businessId", "phoneNumber"]),

  // Sales Orders (Financial Ledger)
  sales: defineTable({
    businessId: v.id("businesses"),
    customerId: v.optional(v.id("customers")),
    orderNumber: v.string(),
    orderStatus: v.string(), // "completed" | "pending" | "cancelled" | "refunded"
    subtotalCents: v.number(),
    taxAmountCents: v.number(),
    totalAmountCents: v.number(),
    amountPaidCents: v.number(),
    changeAmountCents: v.number(),
    paymentMethod: v.string(), // "cash" | "card" | "credit"
    createdBy: v.string(),
    offlineAuthorizationId: v.optional(v.id("offlineAuthorizations")),
    offlineDeviceId: v.optional(v.string()),
    occurredAt: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_businessId", ["businessId"])
    .index("by_businessId_and_orderNumber", ["businessId", "orderNumber"])
    .index("by_customerId", ["customerId"]),

  // Sales Line Items
  salesLineItems: defineTable({
    saleId: v.id("sales"),
    productId: v.id("products"),
    quantityGrams: v.number(),
    unitPriceCents: v.number(),
    lineTotalCents: v.number(),
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
    .index("by_businessId_and_timestamp", ["businessId", "timestamp"]),

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
