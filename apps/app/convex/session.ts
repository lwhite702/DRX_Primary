import { ROLE_PERMISSIONS as WEB_ROLE_PERMISSIONS, type Role as WebRole, type Permission as WebPermission } from "../lib/auth/permissions";
import { businessProfileDto, businessProfileValidator } from "./businessProfiles";
import { query } from "./_generated/server";
import { v } from "convex/values";
import { activeOrganization, findCurrentMembership, requireUserAndBusiness } from "./helpers/auth";

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
