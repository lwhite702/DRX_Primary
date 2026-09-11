import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

const operatorSessionValidator = v.object({
  operatorId: v.string(),
  displayName: v.string(),
  businessId: v.id("businesses"),
  businessName: v.string(),
  roles: v.array(v.string()),
  permissions: v.array(v.string()),
  email: v.union(v.string(), v.null()),
});

const onboardingStatusValidator = v.union(
  v.object({ status: v.literal("NEEDS_BUSINESS_ONBOARDING") }),
  v.object({ status: v.literal("INACTIVE") }),
  v.object({ status: v.literal("BUSINESS_MISSING") }),
  v.object({
    status: v.literal("READY"),
    session: operatorSessionValidator,
  }),
);

const onboardingSetupValidator = v.object({
  locationName: v.optional(v.string()),
  address: v.optional(v.string()),
  city: v.optional(v.string()),
  region: v.optional(v.string()),
  country: v.optional(v.string()),
  postalCode: v.optional(v.string()),
  ownerPhone: v.optional(v.string()),
  tracksInventory: v.optional(v.boolean()),
  dashboardPreset: v.optional(
    v.union(
      v.literal("operations"),
      v.literal("checkout"),
      v.literal("inventory"),
    ),
  ),
  defaultUnit: v.optional(v.string()),
  privacyPreset: v.optional(v.string()),
  privacyProtocolJson: v.optional(v.string()),
  quickQuantities: v.optional(
    v.array(
      v.object({
        label: v.string(),
        value: v.number(),
        unit: v.string(),
      }),
    ),
  ),
  inventoryReasons: v.optional(
    v.array(
      v.object({
        label: v.string(),
        type: v.string(),
      }),
    ),
  ),
  nicknames: v.optional(
    v.array(
      v.object({
        slang: v.string(),
        quantity: v.number(),
        unit: v.string(),
      }),
    ),
  ),
});

const currentBusinessProfileValidator = v.union(
  v.null(),
  v.object({
    id: v.id("businesses"),
    businessName: v.string(),
    business_name: v.string(),
    businessType: v.union(v.string(), v.null()),
    business_type: v.union(v.string(), v.null()),
    ownerId: v.string(),
    owner_id: v.string(),
    clerkOrgId: v.union(v.string(), v.null()),
    currency: v.string(),
    timezone: v.string(),
    collectTax: v.boolean(),
    taxRateBps: v.number(),
    role: v.string(),
    settingsData: v.union(v.string(), v.null()),
  }),
);

const onboardingMutationResultValidator = v.union(
  v.object({
    businessId: v.id("businesses"),
    userId: v.id("users"),
    status: v.literal("BUSINESS_MISSING"),
  }),
  v.object({
    businessId: v.id("businesses"),
    userId: v.id("users"),
    status: v.literal("ALREADY_ONBOARDED"),
    session: operatorSessionValidator,
  }),
  v.object({
    businessId: v.id("businesses"),
    userId: v.id("users"),
    status: v.literal("ONBOARDING_SUCCESS"),
    session: operatorSessionValidator,
  }),
);

export const getCurrentOnboardingStatus = query({
  args: {},
  returns: onboardingStatusValidator,
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("UNAUTHENTICATED");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();

    if (!user) return { status: "NEEDS_BUSINESS_ONBOARDING" as const };
    if (user.status !== "ACTIVE") return { status: "INACTIVE" as const };

    const business = await ctx.db.get(user.businessId);
    if (!business) return { status: "BUSINESS_MISSING" as const };

    return {
      status: "READY" as const,
      session: {
        operatorId: identity.subject,
        displayName: user.name || user.email || "DRX Operator",
        businessId: business._id,
        businessName: business.name,
        roles: [user.role.toLowerCase()],
        permissions: user.role === "OWNER" ? ["*"] : [],
        email: user.email || null,
      },
    };
  },
});

export const getCurrentBusinessProfile = query({
  args: {},
  returns: currentBusinessProfileValidator,
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("UNAUTHENTICATED");
    }

    const user = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", identity.subject))
      .unique();
    if (!user || user.status !== "ACTIVE") return null;

    const business = await ctx.db.get(user.businessId);
    if (!business) return null;

    const settings = await ctx.db
      .query("businessSettings")
      .withIndex("by_businessId", (q) => q.eq("businessId", business._id))
      .unique();

    return {
      id: business._id,
      businessName: business.name,
      business_name: business.name,
      businessType: business.businessType ?? null,
      business_type: business.businessType ?? null,
      ownerId: business.ownerId,
      owner_id: business.ownerId,
      clerkOrgId: business.clerkOrgId ?? null,
      currency: business.currency,
      timezone: business.timezone,
      collectTax: business.collectTax,
      taxRateBps: business.taxRateBps,
      role: user.role.toLowerCase(),
      settingsData: settings?.settingsData ?? null,
    };
  },
});

export const createBusinessOnboarding = mutation({
  args: {
    name: v.optional(v.string()),
    businessName: v.string(),
    businessType: v.optional(v.string()),
    clerkOrgId: v.optional(v.string()),
    currency: v.optional(v.string()),
    timezone: v.optional(v.string()),
    collectTax: v.optional(v.boolean()),
    taxRateBps: v.optional(v.number()),
    setup: v.optional(onboardingSetupValidator),
  },
  returns: onboardingMutationResultValidator,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("UNAUTHENTICATED: Authentication required to onboard business");
    }
    const clerkUserId = identity.subject;
    const email = identity.email || "";
    const now = Date.now();

    // Check if user already exists
    const existingUser = await ctx.db
      .query("users")
      .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId))
      .unique();

    if (existingUser) {
      const existingBusiness = await ctx.db.get(existingUser.businessId);
      if (!existingBusiness) {
        return {
          businessId: existingUser.businessId,
          userId: existingUser._id,
          status: "BUSINESS_MISSING" as const,
        };
      }
      return {
        businessId: existingUser.businessId,
        userId: existingUser._id,
        status: "ALREADY_ONBOARDED" as const,
        session: {
          operatorId: clerkUserId,
          displayName: existingUser.name || existingUser.email || "DRX Operator",
          businessId: existingBusiness._id,
          businessName: existingBusiness.name,
          roles: [existingUser.role.toLowerCase()],
          permissions: existingUser.role === "OWNER" ? ["*"] : [],
          email: existingUser.email || null,
        },
      };
    }

    // 1. Create Business
    const businessId = await ctx.db.insert("businesses", {
      clerkOrgId: args.clerkOrgId,
      name: args.businessName,
      businessType: args.businessType || "Retail POS",
      ownerId: clerkUserId,
      currency: args.currency || "USD",
      timezone: args.timezone || "America/New_York",
      collectTax: args.collectTax ?? true,
      taxRateBps: args.collectTax === false ? 0 : (args.taxRateBps ?? 825),
      createdAt: now,
      updatedAt: now,
    });

    // 2. Create User as OWNER
    const userId = await ctx.db.insert("users", {
      clerkUserId,
      email,
      name: args.name,
      role: "OWNER",
      businessId,
      status: "ACTIVE",
      createdAt: now,
      updatedAt: now,
    });

    const setup = args.setup;
    await ctx.db.insert("businessSettings", {
      businessId,
      themePreference: "dark",
      settingsData: JSON.stringify({
        onboarding_completed: true,
        collect_tax: args.collectTax ?? true,
        default_tax_rate: (args.collectTax === false ? 0 : (args.taxRateBps ?? 825)) / 10_000,
        location_name: setup?.locationName ?? "",
        address: setup?.address ?? "",
        city: setup?.city ?? "",
        region: setup?.region ?? "",
        country: setup?.country ?? "",
        postal_code: setup?.postalCode ?? "",
        owner_phone: setup?.ownerPhone ?? "",
        tracks_inventory: setup?.tracksInventory ?? true,
        dashboard_preset: setup?.dashboardPreset ?? "operations",
        default_unit: setup?.defaultUnit ?? "unit",
        privacy_preset: setup?.privacyPreset ?? "standard_mode",
        privacy_protocol: setup?.privacyProtocolJson
          ? JSON.parse(setup.privacyProtocolJson)
          : null,
        quick_quantities: setup?.quickQuantities ?? [],
        inventory_reasons: setup?.inventoryReasons ?? [],
        nicknames: setup?.nicknames ?? [],
        owner_name: args.name ?? "",
      }),
      createdAt: now,
      updatedAt: now,
    });

    // 3. Log the audit event
    await ctx.db.insert("auditEvents", {
      businessId,
      userId: clerkUserId,
      action: "BUSINESS_ONBOARDED",
      entityType: "business",
      entityId: businessId,
      metadata: JSON.stringify({
        businessName: args.businessName,
        onboardingVersion: 2,
      }),
      timestamp: now,
    });

    return {
      businessId,
      userId,
      status: "ONBOARDING_SUCCESS" as const,
      session: {
        operatorId: clerkUserId,
        displayName: args.name || email || "DRX Operator",
        businessId,
        businessName: args.businessName,
        roles: ["owner"],
        permissions: ["*"],
        email: email || null,
      },
    };
  },
});
