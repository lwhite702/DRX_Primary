import { ROLE_PERMISSIONS as WEB_ROLE_PERMISSIONS, type Role as WebRole, type Permission as WebPermission } from "../lib/auth/permissions";
import { businessProfileDto, businessProfileValidator } from "./businessProfiles";
import { query } from "./_generated/server";
import { v } from "convex/values";
import { activeOrganization, findCurrentMembership, requireUserAndBusiness, requireExpectedIdentity } from "./helpers/auth";

export const currentBusiness = query({
  args: { selectedBusinessId: v.optional(v.string()) },
  returns: v.object({ userId: v.string(), businessId: v.id("businesses"), role: v.string() }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    if (args.selectedBusinessId && args.selectedBusinessId !== auth.businessId &&
        args.selectedBusinessId !== auth.businessRecord.legacyPrismaBusinessId) {
      throw new Error("FORBIDDEN: Selected business does not match membership");
    }
    return { userId: auth.userId, businessId: auth.businessId, role: auth.userRecord.role };
  },
});

export const listMyBusinesses = query({
  args: {},
  returns: v.array(businessProfileValidator),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHENTICATED: Authentication required");
    const memberships = await ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", identity.subject)).take(100);
    const businesses = await Promise.all(memberships.map(member => ctx.db.get(member.businessId)));
    return businesses.filter((business): business is NonNullable<typeof business> => Boolean(business)).map(businessProfileDto);
  },
});

export const permission = query({
  args: { businessId: v.optional(v.string()), userId: v.optional(v.string()), permission: v.string() },
  returns: v.object({ allowed: v.boolean(), role: v.string() }),
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    if ((args.userId && args.userId !== auth.userId) || (args.businessId && args.businessId !== auth.businessId && args.businessId !== auth.businessRecord.legacyPrismaBusinessId)) {
      return { allowed: false, role: "" };
    }
    const role = auth.userRecord.role === "OWNER" ? "owner" : auth.userRecord.role === "ADMIN" ? "admin" : auth.userRecord.role === "MEMBER" ? "staff" : auth.userRecord.role;
    const allowed = args.permission !== "users.manage_all" && (auth.userRecord.permissions?.[args.permission] === true ||
      (WEB_ROLE_PERMISSIONS[role as WebRole] ?? []).includes(args.permission as WebPermission));
    return { allowed, role };
  },
});


export const currentBusinessProfile = query({
  args: { expectedOrganizationId: v.optional(v.string()), expectedUserId: v.optional(v.string()) },
  returns: v.union(v.null(), businessProfileValidator),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHENTICATED: Authentication required");
    if (args.expectedUserId && args.expectedUserId !== identity.subject) {
      throw new Error("FORBIDDEN: Operator changed while loading business");
    }
    const organizationId = activeOrganization(identity);
    if (organizationId && args.expectedOrganizationId && organizationId !== args.expectedOrganizationId) {
      throw new Error("FORBIDDEN: Organization changed while loading business");
    }
    const membership = await findCurrentMembership(ctx, identity);
    if (!membership) return null;
    if (membership.status !== "ACTIVE") throw new Error("FORBIDDEN: Membership is inactive");
    const business = await ctx.db.get(membership.businessId);
    if (!business) throw new Error("NOT_FOUND: Associated business profile not found");
    if (business.isActive === false) throw new Error("FORBIDDEN: Business is inactive");
    if (args.expectedOrganizationId && args.expectedOrganizationId !== business.clerkOrgId) {
      throw new Error("FORBIDDEN: Selected organization does not match membership");
    }
    return businessProfileDto(business);
  },
});

export const mobileBootstrap = query({
  args: { expectedUserId: v.string(), expectedOrganizationId: v.union(v.string(), v.null()) },
  returns: v.object({ operatorId: v.string(), displayName: v.string(), businessId: v.id("businesses"), legacyBusinessId: v.optional(v.string()), businessName: v.string(), roles: v.array(v.string()), permissions: v.array(v.string()), email: v.union(v.string(), v.null()) }),
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new Error("UNAUTHENTICATED: Authentication required");
    requireExpectedIdentity(identity, args);
    const { userId, userRecord: member, businessRecord: business } = await requireUserAndBusiness(ctx);
    const role = member.role === "MEMBER" ? "staff" : member.role.toLowerCase();
    const permissions = role === "owner" ? ["*"] : Object.entries(member.permissions ?? {}).filter(([permission, enabled]) => enabled === true && permission !== "*" && permission !== "users.manage_all").map(([permission]) => permission);
    return { operatorId: userId, displayName: member.name || member.email || "DRX Operator", businessId: business._id, legacyBusinessId: business.legacyPrismaBusinessId, businessName: business.name, roles: [role], permissions, email: member.email || null };
  },
});
