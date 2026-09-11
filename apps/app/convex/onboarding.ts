import { mutation, query } from "./_generated/server";
import { v, type Infer } from "convex/values";
import type { MutationCtx } from "./_generated/server";
import { onboardingCompletionSchema } from "../lib/onboarding/completion-schema";
import { getDefaultPinnedItemsForPreset } from "../lib/auth/dashboard-preferences";
import { requireUserAndBusiness } from "./helpers/auth";
import { settingsData, loadPrivacyPolicy } from "./helpers/businessPreferences";
import { setupBusinessSchema } from "../lib/onboarding/setup-schema";
import { getDefaultPrivacyProtocol } from "../lib/privacy/profiles";
import { activeOrganization, findCurrentMembership, requireExpectedIdentity } from "./helpers/auth";

const operatorSessionValidator = v.object({
  operatorId: v.string(),
  displayName: v.string(),
  businessId: v.id("businesses"),
  businessName: v.string(),
  legacyBusinessId: v.optional(v.string()),
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
  args: { expectedUserId: v.optional(v.string()), expectedOrganizationId: v.optional(v.union(v.string(), v.null())) },
  returns: onboardingStatusValidator,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("UNAUTHENTICATED");
    }

    requireExpectedIdentity(identity, args);
    const user = await findCurrentMembership(ctx, identity);

    if (!user) return { status: "NEEDS_BUSINESS_ONBOARDING" as const };
    if (user.status !== "ACTIVE") return { status: "INACTIVE" as const };

    const business = await ctx.db.get(user.businessId);
    if (!business) return { status: "BUSINESS_MISSING" as const };
    if (business.isActive === false) return { status: "INACTIVE" as const };

    return {
      status: "READY" as const,
      session: {
        operatorId: identity.subject,
        displayName: user.name || user.email || "DRX Operator",
        businessId: business._id,
        legacyBusinessId: business.legacyPrismaBusinessId,
        businessName: business.name,
        roles: [user.role.toLowerCase()],
        permissions: user.role === "OWNER" ? ["*"] : [],
        email: user.email || null,
      },
    };
  },
});

const createOnboardingArgs = v.object({
    expectedUserId: v.optional(v.string()),
    expectedOrganizationId: v.optional(v.union(v.string(), v.null())),
    name: v.optional(v.string()),
    businessName: v.string(),
    setupJson: v.optional(v.string()),
    businessType: v.optional(v.string()),
    clerkOrgId: v.optional(v.string()),
    currency: v.optional(v.string()),
    timezone: v.optional(v.string()),
    collectTax: v.optional(v.boolean()),
    taxRateBps: v.optional(v.number()),
});
async function provisionBusiness(ctx: MutationCtx, args: Infer<typeof createOnboardingArgs>) {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("UNAUTHENTICATED: Authentication required to onboard business");
    }
    requireExpectedIdentity(identity, args);
    let setup;
    if (args.setupJson !== undefined) {
      if (args.setupJson.length > 64000) throw new Error("INVALID_ARGUMENT: Setup payload too large");
      try { setup = setupBusinessSchema.parse(JSON.parse(args.setupJson)); }
      catch { throw new Error("INVALID_ARGUMENT: Invalid business setup"); }
      if (setup.businessName !== args.businessName.trim()) throw new Error("INVALID_ARGUMENT: Conflicting business name");
    }
    const clerkUserId = identity.subject;
    const email = identity.email || "";
    const now = Date.now();

    const organizationId = activeOrganization(identity);
    if (args.clerkOrgId && args.clerkOrgId !== organizationId) {
      throw new Error("FORBIDDEN: Organization must match the authenticated session");
    }
    const existingUser = await findCurrentMembership(ctx, identity);

    if (existingUser) {
      if (existingUser.status !== "ACTIVE") throw new Error("FORBIDDEN: Membership is inactive");
      const existingBusiness = await ctx.db.get(existingUser.businessId);
      if (!existingBusiness) {
        return {
          businessId: existingUser.businessId,
          userId: existingUser._id,
          status: "BUSINESS_MISSING" as const,
        };
      }
      if (existingBusiness.isActive === false) throw new Error("FORBIDDEN: Business is inactive");
      return {
        businessId: existingUser.businessId,
        userId: existingUser._id,
        status: "ALREADY_ONBOARDED" as const,
        session: {
          operatorId: clerkUserId,
          displayName: existingUser.name || existingUser.email || "DRX Operator",
          businessId: existingBusiness._id,
          legacyBusinessId: existingBusiness.legacyPrismaBusinessId,
          businessName: existingBusiness.name,
          roles: [existingUser.role.toLowerCase()],
          permissions: existingUser.role === "OWNER" ? ["*"] : [],
          email: existingUser.email || null,
        },
      };
    }

    if (organizationId) {
      const organization = identity.o;
      const role = organization && typeof organization === "object" && !Array.isArray(organization)
        ? (organization as Record<string, unknown>).rol : identity.org_role;
      if (role !== "admin" && role !== "org:admin") {
        throw new Error("FORBIDDEN: Organization administrator required to create a business");
      }
    }
    const previousMemberships = await ctx.db.query("users")
      .withIndex("by_clerkUserId", q => q.eq("clerkUserId", clerkUserId)).take(2);
    // Preserve the original native/default tenant when adding an organization.
    if (previousMemberships.length === 1 && previousMemberships[0].isDefaultMembership === undefined) {
      await ctx.db.patch(previousMemberships[0]._id, { isDefaultMembership: true });
    }

    if (!args.businessName.trim() || args.businessName.trim().length > 255 ||
        (args.taxRateBps !== undefined && (!Number.isSafeInteger(args.taxRateBps) || args.taxRateBps < 0 || args.taxRateBps > 10000))) {
      throw new Error("INVALID_ARGUMENT: Invalid business name or tax rate");
    }
    // 1. Create Business
    const businessId = await ctx.db.insert("businesses", {
      clerkOrgId: organizationId,
      name: args.businessName.trim(),
      ...(setup ? { address: setup.address, city: setup.city, state: setup.state, zipCode: setup.zipCode, phoneNumber: setup.ownerPhone } : {}),
      businessType: args.businessType || "Retail POS",
      ownerId: clerkUserId,
      currency: args.currency || "USD",
      timezone: args.timezone || "America/New_York",
      collectTax: args.collectTax ?? true,
      taxRateBps: args.collectTax === false ? 0 : (args.taxRateBps ?? 825),
      createdAt: now,
      updatedAt: now,
    });

    await ctx.db.insert("businessPrivacyPolicies", {
      businessId, protocol: getDefaultPrivacyProtocol(setup?.privacyPreset), revision: 0,
      createdAt: now, updatedAt: now, updatedBy: clerkUserId,
    });

    if (setup) {
      await ctx.db.insert("businessSettings", {
        businessId, createdAt: now, updatedAt: now,
        settingsData: JSON.stringify({
          onboarding_completed: true, default_unit: setup.defaultUnit,
          quick_quantities: setup.quickQuantities, inventory_reasons: setup.inventoryReasons,
          nicknames: setup.nicknames, owner_name: setup.ownerName,
        }),
      });
    }

    // 2. Create User as OWNER
    const userId = await ctx.db.insert("users", {
      clerkUserId,
      isDefaultMembership: previousMemberships.length === 0,
      email,
      name: setup?.ownerName ?? args.name,
      role: "OWNER",
      businessId,
      status: "ACTIVE",
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
      metadata: JSON.stringify({ setupConfigured: Boolean(setup) }),
      timestamp: now,
    });

    return {
      businessId,
      userId,
      status: "ONBOARDING_SUCCESS" as const,
      session: {
        operatorId: clerkUserId,
        displayName: setup?.ownerName || args.name || email || "DRX Operator",
        businessId,
        businessName: args.businessName,
        roles: ["owner"],
        permissions: ["*"],
        email: email || null,
      },
    };
}
export const createBusinessOnboarding = mutation({
  args: createOnboardingArgs, returns: onboardingMutationResultValidator, handler: provisionBusiness,
});

export const completeBusinessOnboarding = mutation({
  args: { payload: v.string(), expectedUserId: v.string(), expectedOrganizationId: v.optional(v.union(v.string(), v.null())) },
  returns: v.object({ businessId: v.id("businesses") }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || identity.subject !== args.expectedUserId) throw new Error("FORBIDDEN: Unexpected operator");
    requireExpectedIdentity(identity, args);
    if (args.payload.length > 16000) throw new Error("INVALID_ARGUMENT: Payload too large");
    let input;
    try { input = onboardingCompletionSchema.parse(JSON.parse(args.payload)); }
    catch { throw new Error("INVALID_ARGUMENT: Invalid onboarding fields"); }
    const result = await provisionBusiness(ctx, {
      businessName: input.businessName, businessType: input.businessType, name: input.ownerName,
      currency: input.currency, timezone: input.timezone, collectTax: input.taxEnabled, taxRateBps: input.taxRateBps,
    });
    if (result.status === "BUSINESS_MISSING") throw new Error("INVALID_STATE: Business requires reconciliation");
    const auth = await requireUserAndBusiness(ctx);
    if (auth.userRecord.role !== "OWNER") throw new Error("FORBIDDEN: Only the owner can complete business setup");
    await loadPrivacyPolicy(ctx, result.businessId);
    const existing = await ctx.db.query("businessSettings").withIndex("by_businessId", q => q.eq("businessId", result.businessId)).unique();
    const previous = settingsData(existing);
    const data = { ...previous, onboarding_completed: true,
      dashboard_preset: input.dashboardPreset,
      dashboard_preferences: { preset: input.dashboardPreset, pinnedItemIds: getDefaultPinnedItemsForPreset(input.dashboardPreset), version: 1 },
      inventory_enabled: input.inventoryEnabled, location_name: input.locationName,
      country: input.country, owner_name: input.ownerName,
    };
    const patch = { name: input.businessName, businessType: input.businessType, currency: input.currency,
      timezone: input.timezone, collectTax: input.taxEnabled, taxRateBps: input.taxRateBps,
      city: input.city, state: input.region };
    const business = await ctx.db.get(result.businessId);
    const changed = Object.entries(patch).some(([key, value]) => business?.[key as keyof typeof business] !== value)
      || auth.userRecord.name !== input.ownerName || auth.userRecord.dashboardPreferences?.preset !== input.dashboardPreset || JSON.stringify(previous) !== JSON.stringify(data);
    if (!changed) return { businessId: result.businessId };
    const now = Date.now();
    await ctx.db.patch(result.businessId, { ...patch, updatedAt: now });
    await ctx.db.patch(auth.userRecord._id, { name: input.ownerName, dashboardPreferences: auth.userRecord.dashboardPreferences?.preset === input.dashboardPreset ? auth.userRecord.dashboardPreferences : { preset: input.dashboardPreset, pinnedItemIds: getDefaultPinnedItemsForPreset(input.dashboardPreset), version: 1, updatedAt: new Date(now).toISOString() }, updatedAt: now });
    if (existing) await ctx.db.patch(existing._id, { settingsData: JSON.stringify(data), updatedAt: now });
    else await ctx.db.insert("businessSettings", { businessId: result.businessId, settingsData: JSON.stringify(data), createdAt: now, updatedAt: now });
    await ctx.db.insert("auditEvents", { businessId: result.businessId, userId: identity.subject, action: "BUSINESS_SETUP_COMPLETED", metadata: JSON.stringify({ fields: Object.keys(input) }), entityType: "business", entityId: result.businessId, timestamp: now });
    return { businessId: result.businessId };
  },
});
