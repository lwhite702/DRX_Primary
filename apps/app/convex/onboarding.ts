import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { setupBusinessSchema } from "../lib/onboarding/setup-schema";
import { getDefaultPrivacyProtocol } from "../lib/privacy/profiles";
import { activeOrganization, findCurrentMembership } from "./helpers/auth";

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
        businessName: business.name,
        roles: [user.role.toLowerCase()],
        permissions: user.role === "OWNER" ? ["*"] : [],
        email: user.email || null,
      },
    };
  },
});

export const createBusinessOnboarding = mutation({
  args: {
    name: v.optional(v.string()),
    businessName: v.string(),
    setupJson: v.optional(v.string()),
    businessType: v.optional(v.string()),
    clerkOrgId: v.optional(v.string()),
    currency: v.optional(v.string()),
    timezone: v.optional(v.string()),
    collectTax: v.optional(v.boolean()),
    taxRateBps: v.optional(v.number()),
  },
  returns: onboardingMutationResultValidator,
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) {
      throw new Error("UNAUTHENTICATED: Authentication required to onboard business");
    }
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
  },
});
