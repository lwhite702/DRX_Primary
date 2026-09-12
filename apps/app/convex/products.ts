import { paginationOptsValidator } from "convex/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";
import {
  calculateSuggestedQuantityForDollarAmount,
  validateSaleQuantity,
} from "./helpers/pricing";
import {
  defaultCommerceConfig,
  normalizeProductCommerceConfig,
} from "./helpers/productCommerce";
import { normalizeManualLineName } from "./helpers/manualLinePolicy";
import { canonicalCreationCommerce } from "../lib/commerce/product-creation";

export const productRecord = v.object({
  _id: v.id("products"),
  _creationTime: v.number(),
  businessId: v.id("businesses"),
  legacyPrismaId: v.optional(v.string()),
  sku: v.string(),
  productName: v.string(),
  description: v.optional(v.string()),
  category: v.optional(v.string()),
  sellingPriceCents: v.number(),
  unitCostCents: v.number(),
  isTaxable: v.optional(v.boolean()),
  location: v.optional(v.string()),
  quantityOnHandGrams: v.number(),
  reorderLevelGrams: v.number(),
  allowFractionalWeight: v.boolean(),
  sellingUnit: v.string(),
  quantityPrecision: v.number(),
  minimumSaleQuantity: v.number(),
  quantityIncrement: v.number(),
  suggestedQuantityPresets: v.array(v.number()),
  suggestedDollarPresetsCents: v.array(v.number()),
  bulkPriceTiers: v.array(
    v.object({
      minimumQuantity: v.number(),
      unitPriceCents: v.number(),
    }),
  ),
  isActive: v.boolean(),
  createdAt: v.number(),
  updatedAt: v.number(),
});

export const updateCommerceConfig = mutation({
  args: {
    productId: v.id("products"),
    legacyPrismaBusinessId: v.optional(v.string()),
    legacyPrismaId: v.optional(v.string()),
    allowFractionalQuantity: v.optional(v.boolean()),
    baseUnitPriceCents: v.optional(v.number()),
    sellingUnit: v.string(),
    quantityPrecision: v.number(),
    minimumSaleQuantity: v.number(),
    quantityIncrement: v.number(),
    suggestedQuantityPresets: v.array(v.number()),
    suggestedDollarPresetsCents: v.array(v.number()),
    bulkPriceTiers: v.array(
      v.object({
        minimumQuantity: v.number(),
        unitPriceCents: v.number(),
      }),
    ),
  },
  returns: v.object({ success: v.literal(true) }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_PRODUCTS");
    const product = await ctx.db.get(args.productId);
    if (!product || product.businessId !== auth.businessId) {
      throw new Error(`NOT_FOUND: Product '${args.productId}' not found`);
    }
    const normalizeLegacyId = (value: string, field: string) => {
      const normalized = value.trim();
      if (!normalized || normalized.length > 128) {
        throw new Error(
          `INVALID_ARGUMENT: ${field} must be between 1 and 128 characters`,
        );
      }
      return normalized;
    };
    const legacyPrismaBusinessId = args.legacyPrismaBusinessId
      ? normalizeLegacyId(
          args.legacyPrismaBusinessId,
          "legacyPrismaBusinessId",
        )
      : undefined;
    const legacyPrismaId = args.legacyPrismaId
      ? normalizeLegacyId(args.legacyPrismaId, "legacyPrismaId")
      : undefined;
    if (legacyPrismaBusinessId) {
      if (
        auth.businessRecord.legacyPrismaBusinessId &&
        auth.businessRecord.legacyPrismaBusinessId !== legacyPrismaBusinessId
      ) {
        throw new Error(
          `CONFLICT: Business is already linked to legacy Prisma business '${auth.businessRecord.legacyPrismaBusinessId}'`,
        );
      }
      const conflictingBusiness = await ctx.db
        .query("businesses")
        .withIndex("by_legacyPrismaBusinessId", (q) =>
          q.eq("legacyPrismaBusinessId", legacyPrismaBusinessId),
        )
        .unique();
      if (conflictingBusiness && conflictingBusiness._id !== auth.businessId) {
        throw new Error(
          "CONFLICT: Legacy Prisma business identity is already linked",
        );
      }
    }
    if (
      legacyPrismaId &&
      !legacyPrismaBusinessId &&
      !auth.businessRecord.legacyPrismaBusinessId
    ) {
      throw new Error(
        "INVALID_ARGUMENT: legacyPrismaBusinessId is required before linking a product",
      );
    }
    if (legacyPrismaId) {
      if (product.legacyPrismaId && product.legacyPrismaId !== legacyPrismaId) {
        throw new Error(
          `CONFLICT: Product is already linked to legacy Prisma product '${product.legacyPrismaId}'`,
        );
      }
      const conflictingProduct = await ctx.db
        .query("products")
        .withIndex("by_businessId_and_legacyPrismaId", (q) =>
          q
            .eq("businessId", auth.businessId)
            .eq("legacyPrismaId", legacyPrismaId),
        )
        .unique();
      if (conflictingProduct && conflictingProduct._id !== product._id) {
        throw new Error(
          "CONFLICT: Legacy Prisma product identity is already linked in this business",
        );
      }
    }
    const sellingUnit = args.sellingUnit.trim();
    if (!sellingUnit || sellingUnit.length > 40) {
      throw new Error("INVALID_ARGUMENT: sellingUnit must be between 1 and 40 characters");
    }
    if (
      !Number.isSafeInteger(args.quantityPrecision) ||
      args.quantityPrecision < 0 ||
      args.quantityPrecision > 6
    ) {
      throw new Error("INVALID_ARGUMENT: quantityPrecision must be an integer from 0 to 6");
    }
    const baseUnitPriceCents =
      args.baseUnitPriceCents ?? product.sellingPriceCents;
    if (!Number.isSafeInteger(baseUnitPriceCents) || baseUnitPriceCents <= 0) {
      throw new Error(
        "INVALID_ARGUMENT: baseUnitPriceCents must be positive integer cents",
      );
    }
    const scale = 10 ** args.quantityPrecision;
    const requireQuantity = (value: number, field: string) => {
      if (
        !Number.isFinite(value) ||
        value <= 0 ||
        Math.round(value * scale) <= 0 ||
        Math.abs(value * scale - Math.round(value * scale)) > 1e-8
      ) {
        throw new Error(`INVALID_ARGUMENT: ${field} must be a positive quantity`);
      }
    };
    const allowFractionalQuantity =
      args.allowFractionalQuantity ?? product.allowFractionalWeight;
    requireQuantity(args.minimumSaleQuantity, "minimumSaleQuantity");
    requireQuantity(args.quantityIncrement, "quantityIncrement");
    if (
      !allowFractionalQuantity &&
      (!Number.isInteger(args.minimumSaleQuantity) ||
        !Number.isInteger(args.quantityIncrement))
    ) {
      throw new Error(
        "INVALID_ARGUMENT: Whole-unit products require integer minimum and increment values",
      );
    }
    const requireValidSaleQuantity = (value: number, field: string) => {
      const validation = validateSaleQuantity({
        quantity: value,
        allowFractional: allowFractionalQuantity,
        quantityPrecision: args.quantityPrecision,
        minimumSaleQuantity: args.minimumSaleQuantity,
        quantityIncrement: args.quantityIncrement,
      });
      if (!validation.valid) {
        throw new Error(
          `INVALID_ARGUMENT: ${field} violates the configured quantity rules (${validation.reason})`,
        );
      }
    };
    for (const quantity of args.suggestedQuantityPresets) {
      requireQuantity(quantity, "suggestedQuantityPresets");
      requireValidSaleQuantity(quantity, "suggestedQuantityPresets");
    }
    for (const cents of args.suggestedDollarPresetsCents) {
      if (!Number.isSafeInteger(cents) || cents <= 0) {
        throw new Error("INVALID_ARGUMENT: Suggested dollar presets must be positive integer cents");
      }
    }
    let previousMinimum = 0;
    for (const tier of args.bulkPriceTiers) {
      requireQuantity(tier.minimumQuantity, "bulk minimumQuantity");
      requireValidSaleQuantity(tier.minimumQuantity, "bulk minimumQuantity");
      if (tier.minimumQuantity <= previousMinimum) {
        throw new Error("INVALID_ARGUMENT: Bulk tiers must have ascending, non-overlapping thresholds");
      }
      if (!Number.isSafeInteger(tier.unitPriceCents) || tier.unitPriceCents <= 0) {
        throw new Error("INVALID_ARGUMENT: Bulk unit prices must be positive integer cents");
      }
      if (tier.unitPriceCents > baseUnitPriceCents) {
        throw new Error("INVALID_ARGUMENT: Bulk unit price cannot exceed the base unit price");
      }
      previousMinimum = tier.minimumQuantity;
    }
    const now = Date.now();
    if (
      legacyPrismaBusinessId &&
      !auth.businessRecord.legacyPrismaBusinessId
    ) {
      await ctx.db.patch(auth.businessId, {
        legacyPrismaBusinessId,
        updatedAt: now,
      });
    }
    await ctx.db.patch(args.productId, {
      ...(legacyPrismaId ? { legacyPrismaId } : {}),
      ...(args.allowFractionalQuantity !== undefined
        ? { allowFractionalWeight: args.allowFractionalQuantity }
        : {}),
      sellingPriceCents: baseUnitPriceCents,
      sellingUnit,
      quantityPrecision: args.quantityPrecision,
      minimumSaleQuantity: args.minimumSaleQuantity,
      quantityIncrement: args.quantityIncrement,
      suggestedQuantityPresets: [...new Set(args.suggestedQuantityPresets)],
      suggestedDollarPresetsCents: [...new Set(args.suggestedDollarPresetsCents)],
      bulkPriceTiers: args.bulkPriceTiers,
      updatedAt: now,
    });
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "PRODUCT_COMMERCE_CONFIG_UPDATED",
      entityType: "product",
      entityId: args.productId,
      metadata: JSON.stringify({
        sellingUnit,
        allowFractionalQuantity:
          args.allowFractionalQuantity ?? product.allowFractionalWeight,
        baseUnitPriceCents,
        quantityPrecision: args.quantityPrecision,
        bulkTierCount: args.bulkPriceTiers.length,
      }),
      timestamp: now,
    });
    return { success: true as const };
  },
});

export const linkLegacyPrismaProduct = mutation({
  args: {
    productId: v.id("products"),
    legacyPrismaId: v.string(),
  },
  returns: v.object({
    productId: v.id("products"),
    legacyPrismaId: v.string(),
  }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_PRODUCTS");
    const product = await ctx.db.get(args.productId);
    if (!product || product.businessId !== auth.businessId) {
      throw new Error(`NOT_FOUND: Product '${args.productId}' not found`);
    }
    if (!auth.businessRecord.legacyPrismaBusinessId) {
      throw new Error(
        "INVALID_STATE: Link the legacy Prisma business before linking a product",
      );
    }
    const legacyPrismaId = args.legacyPrismaId.trim();
    if (!legacyPrismaId || legacyPrismaId.length > 128) {
      throw new Error(
        "INVALID_ARGUMENT: legacyPrismaId must be between 1 and 128 characters",
      );
    }
    if (product.legacyPrismaId && product.legacyPrismaId !== legacyPrismaId) {
      throw new Error(
        `CONFLICT: Product is already linked to legacy Prisma product '${product.legacyPrismaId}'`,
      );
    }
    const duplicate = await ctx.db
      .query("products")
      .withIndex("by_businessId_and_legacyPrismaId", (q) =>
        q
          .eq("businessId", auth.businessId)
          .eq("legacyPrismaId", legacyPrismaId),
      )
      .unique();
    if (duplicate && duplicate._id !== product._id) {
      throw new Error(
        "CONFLICT: Legacy Prisma product identity is already linked in this business",
      );
    }
    if (!product.legacyPrismaId) {
      const now = Date.now();
      await ctx.db.patch(product._id, { legacyPrismaId, updatedAt: now });
      await ctx.db.insert("auditEvents", {
        businessId: auth.businessId,
        userId: auth.userId,
        action: "LEGACY_PRISMA_PRODUCT_LINKED",
        entityType: "product",
        entityId: product._id,
        metadata: JSON.stringify({ mappingAdded: true }),
        timestamp: now,
      });
    }
    return { productId: product._id, legacyPrismaId };
  },
});

export const suggestQuantityForDollarAmount = query({
  args: {
    productId: v.id("products"),
    amountCents: v.number(),
  },
  returns: v.object({
    suggestedQuantity: v.number(),
    appliedUnitPriceCents: v.number(),
    estimatedSubtotalCents: v.number(),
    sellingUnit: v.string(),
  }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "PROCESS_CHECKOUT");
    const product = await ctx.db.get(args.productId);
    if (
      !product ||
      product.businessId !== auth.businessId ||
      !product.isActive
    ) {
      throw new Error(`NOT_FOUND: Product '${args.productId}' not found`);
    }
    const commerceConfig = normalizeProductCommerceConfig(product);
    const suggestion = calculateSuggestedQuantityForDollarAmount({
      amountCents: args.amountCents,
      product: {
        productId: String(product._id),
        productName: product.productName,
        baseUnitPriceCents: product.sellingPriceCents,
        taxable: product.isTaxable !== false,
        allowFractional: product.allowFractionalWeight,
        quantityPrecision: commerceConfig.quantityPrecision,
        minimumSaleQuantity: commerceConfig.minimumSaleQuantity,
        quantityIncrement: commerceConfig.quantityIncrement,
        bulkPriceTiers: commerceConfig.bulkPriceTiers,
      },
    });
    return {
      ...suggestion,
      sellingUnit: commerceConfig.sellingUnit,
    };
  },
});

export const createProduct = mutation({
  args: {
    selectedBusinessId: v.optional(v.string()),
    sku: v.string(),
    productName: v.string(),
    description: v.optional(v.string()),
    category: v.optional(v.string()),
    sellingPriceCents: v.number(),
    unitCostCents: v.number(),
    isTaxable: v.optional(v.boolean()),
    location: v.optional(v.string()),
    allowFractionalWeight: v.optional(v.boolean()),
    reorderLevelGrams: v.optional(v.number()),
    commerceConfig: v.optional(v.object({
      sellingUnit: v.string(),
      decimalPrecision: v.number(),
      minimumSaleQuantity: v.number(),
      quantityIncrement: v.number(),
      suggestedDollarAmounts: v.array(v.number()),
      suggestedQuantities: v.array(v.number()),
    })),
    initialQuantity: v.optional(v.number()),
  },
  returns: v.id("products"),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    if (args.selectedBusinessId && args.selectedBusinessId !== auth.businessId &&
        args.selectedBusinessId !== auth.businessRecord.legacyPrismaBusinessId) {
      throw new Error("FORBIDDEN: Selected business does not match membership");
    }
    requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    const now = Date.now();

    // Check SKU uniqueness per business
    const existing = await ctx.db
      .query("products")
      .withIndex("by_businessId_and_sku", (q) =>
        q.eq("businessId", auth.businessId).eq("sku", args.sku),
      )
      .unique();

    if (existing) {
      throw new Error(
        `ALREADY_EXISTS: Product SKU '${args.sku}' already exists in catalog`,
      );
    }

    const allowFractionalWeight = args.allowFractionalWeight ?? true;
    const commerceDefaults = defaultCommerceConfig(allowFractionalWeight);
    const creationCommerce = args.commerceConfig ? canonicalCreationCommerce({
      ...args.commerceConfig,
      fractionalEnabled: allowFractionalWeight,
      bulkPriceTiers: [],
    }) : undefined;
    if ((
      !Number.isSafeInteger(args.sellingPriceCents) || args.sellingPriceCents <= 0 ||
      !Number.isSafeInteger(args.unitCostCents) || args.unitCostCents < 0 ||
      !Number.isFinite(args.reorderLevelGrams ?? 10) || (args.reorderLevelGrams ?? 10) < 0
    )) throw new Error("INVALID_ARGUMENT: Enter valid integer-cent prices and a nonnegative reorder level");
    const initialQuantity = args.initialQuantity ?? 0;
    const scale = 10 ** (creationCommerce?.quantityPrecision ?? commerceDefaults.quantityPrecision);
    if (!Number.isFinite(initialQuantity) || initialQuantity < 0 ||
        !Number.isSafeInteger(Math.round(initialQuantity * scale)) ||
        Math.abs(initialQuantity * scale - Math.round(initialQuantity * scale)) > 1e-6 ||
        (!allowFractionalWeight && !Number.isInteger(initialQuantity))) {
      throw new Error("INVALID_ARGUMENT: Starting stock must fit the product quantity precision");
    }
    if (initialQuantity > 0 && (!Number.isSafeInteger(args.unitCostCents) || args.unitCostCents < 0)) {
      throw new Error("INVALID_ARGUMENT: Starting stock requires a nonnegative integer-cent unit cost");
    }
    const location = args.location?.trim() || undefined;
    const productId = await ctx.db.insert("products", {
      businessId: auth.businessId,
      sku: args.sku,
      productName: args.productName,
      description: args.description,
      category: args.category || "General",
      sellingPriceCents: args.sellingPriceCents,
      unitCostCents: args.unitCostCents,
      isTaxable: args.isTaxable ?? true,
      location,
      quantityOnHandGrams: initialQuantity,
      reorderLevelGrams: args.reorderLevelGrams ?? 10,
      allowFractionalWeight,
      ...commerceDefaults,
      suggestedQuantityPresets: [],
      suggestedDollarPresetsCents: [],
      bulkPriceTiers: [],
      ...creationCommerce,
      isActive: true,
      createdAt: now,
      updatedAt: now,
    });

    if (initialQuantity > 0) {
      await ctx.db.insert("inventoryBatches", {
        businessId: auth.businessId,
        productId,
        originalQuantityGrams: initialQuantity,
        remainingQuantityGrams: initialQuantity,
        unitCostPerGramCents: args.unitCostCents,
        location,
        receivedAt: now,
        createdBy: auth.userId,
        createdAt: now,
        updatedAt: now,
      });
    }

    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "PRODUCT_CREATED",
      entityType: "product",
      entityId: productId,
      metadata: JSON.stringify({ sku: args.sku, name: args.productName, delta: initialQuantity, reason: "Product created" }),
      timestamp: now,
    });

    return productId;
  },
});

export const archiveProduct = mutation({
  args: { productId: v.id("products") },
  returns: v.object({ success: v.literal(true) }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    const product = await ctx.db.get(args.productId);
    if (!product || product.businessId !== auth.businessId) {
      throw new Error(`NOT_FOUND: Product '${args.productId}' not found`);
    }
    const now = Date.now();
    await ctx.db.patch(args.productId, { isActive: false, updatedAt: now });
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "PRODUCT_ARCHIVED",
      entityType: "product",
      entityId: args.productId,
      metadata: JSON.stringify({ sku: product.sku, name: product.productName }),
      timestamp: now,
    });
    return { success: true as const };
  },
});

export const reactivateProduct = mutation({
  args: { productId: v.id("products") },
  returns: v.object({ success: v.literal(true) }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_INVENTORY");
    const product = await ctx.db.get(args.productId);
    if (!product || product.businessId !== auth.businessId) {
      throw new Error(`NOT_FOUND: Product '${args.productId}' not found`);
    }
    const now = Date.now();
    await ctx.db.patch(args.productId, { isActive: true, updatedAt: now });
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "PRODUCT_REACTIVATED",
      entityType: "product",
      entityId: args.productId,
      metadata: JSON.stringify({ sku: product.sku, name: product.productName }),
      timestamp: now,
    });
    return { success: true as const };
  },
});

export const listProducts = query({
  args: { includeArchived: v.optional(v.boolean()) },
  returns: v.array(productRecord),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    const queryBuilder = args?.includeArchived
      ? ctx.db.query("products").withIndex("by_businessId", (q) => q.eq("businessId", auth.businessId))
      : ctx.db.query("products").withIndex("by_businessId_and_isActive", (q) =>
          q.eq("businessId", auth.businessId).eq("isActive", true),
        );
    const products = await queryBuilder.take(500);

    return products.map((product) => ({
      ...product,
      ...normalizeProductCommerceConfig(product),
    }));
  },
});

export const upsertManualLinePolicy = mutation({
  args: {
    name: v.string(),
    isTaxable: v.boolean(),
    unitCostCents: v.optional(v.number()),
  },
  returns: v.object({ policyId: v.id("manualLinePolicies") }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    requirePermission(auth.userRecord, "MANAGE_COMMERCE_SETTINGS");
    const { name, nameKey } = normalizeManualLineName(args.name);
    if (
      args.unitCostCents !== undefined &&
      (!Number.isSafeInteger(args.unitCostCents) || args.unitCostCents < 0)
    ) {
      throw new Error(
        "INVALID_ARGUMENT: unitCostCents must be nonnegative integer cents",
      );
    }
    const existing = await ctx.db
      .query("manualLinePolicies")
      .withIndex("by_businessId_and_nameKey", (q) =>
        q.eq("businessId", auth.businessId).eq("nameKey", nameKey),
      )
      .unique();
    const now = Date.now();
    let policyId;
    if (existing) {
      policyId = existing._id;
      await ctx.db.patch(existing._id, {
        name,
        isTaxable: args.isTaxable,
        unitCostCents: args.unitCostCents,
        isActive: true,
        updatedBy: auth.userId,
        updatedAt: now,
      });
    } else {
      policyId = await ctx.db.insert("manualLinePolicies", {
        businessId: auth.businessId,
        nameKey,
        name,
        isTaxable: args.isTaxable,
        unitCostCents: args.unitCostCents,
        isActive: true,
        updatedBy: auth.userId,
        createdAt: now,
        updatedAt: now,
      });
    }
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId,
      userId: auth.userId,
      action: "MANUAL_LINE_POLICY_UPSERTED",
      entityType: "manual_line_policy",
      entityId: policyId,
      metadata: JSON.stringify({
        nameKey,
        isTaxable: args.isTaxable,
        costKnown: args.unitCostCents !== undefined,
      }),
      timestamp: now,
    });
    return { policyId };
  },
});

// Selected legacy business identifiers are accepted only through an explicit
// tenant mapping. Product identities and stock always come from Convex.
export const listCatalogPage = query({
  args: { businessId: v.string(), paginationOpts: paginationOptsValidator },
  returns: v.object({ page: v.array(productRecord), isDone: v.boolean(), continueCursor: v.string() }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    if (args.businessId !== auth.businessId && args.businessId !== auth.businessRecord.legacyPrismaBusinessId) {
      throw new Error("FORBIDDEN: Selected business does not match membership");
    }
    if (!Number.isInteger(args.paginationOpts.numItems) || args.paginationOpts.numItems < 1 || args.paginationOpts.numItems > 200) {
      throw new Error("INVALID_ARGUMENT: Page size must be between 1 and 200");
    }
    const result = await ctx.db.query("products")
      .withIndex("by_businessId_and_isActive", q => q.eq("businessId", auth.businessId).eq("isActive", true))
      .order("desc").paginate(args.paginationOpts);
    return { page: result.page.map(product => ({ ...product, ...normalizeProductCommerceConfig(product) })),
      isDone: result.isDone, continueCursor: result.continueCursor };
  },
});

export const getCatalogProduct = query({
  args: { businessId: v.string(), productId: v.id("products") },
  returns: productRecord,
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    if (args.businessId !== auth.businessId && args.businessId !== auth.businessRecord.legacyPrismaBusinessId) {
      throw new Error("FORBIDDEN: Selected business does not match membership");
    }
    const product = await ctx.db.get(args.productId);
    if (!product || product.businessId !== auth.businessId || !product.isActive) throw new Error("NOT_FOUND: Product unavailable");
    return { ...product, ...normalizeProductCommerceConfig(product) };
  },
});
