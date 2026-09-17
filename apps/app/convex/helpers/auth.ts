import type { UserIdentity } from "convex/server";
import type { QueryCtx, MutationCtx } from "../_generated/server";
import type { Doc, Id } from "../_generated/dataModel";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  userRecord: Doc<"users">;
  businessRecord: Doc<"businesses">;
  businessId: Id<"businesses">;
}

/** Only read claims from Convex's verified identity, never a decoded client token. */
export function activeOrganization(identity: UserIdentity): string | undefined {
  const legacy = identity.org_id ?? undefined;
  const organization = identity.o ?? undefined;
  const current = organization && typeof organization === "object" && !Array.isArray(organization)
    ? (organization as Record<string, unknown>).id : undefined;
  if ((legacy !== undefined && (typeof legacy !== "string" || !legacy)) ||
      (organization !== undefined && (typeof current !== "string" || !current)) ||
      (legacy !== undefined && current !== undefined && legacy !== current)) {
    throw new Error("FORBIDDEN: Invalid organization context");
  }
  return (current ?? legacy) as string | undefined;
}

/** Optional for installed native clients; web sends null for an explicitly personal session. */
export function requireExpectedIdentity(identity: UserIdentity, expected: { expectedUserId?: string; expectedOrganizationId?: string | null }) {
  if (expected.expectedUserId !== undefined && identity.subject !== expected.expectedUserId) throw new Error("FORBIDDEN: Unexpected operator");
  if (expected.expectedOrganizationId !== undefined && (activeOrganization(identity) ?? null) !== expected.expectedOrganizationId) throw new Error("FORBIDDEN: Organization context changed");
}

/** Users are tenant memberships; role and grants must come from the selected row. */
export async function findCurrentMembership(ctx: QueryCtx | MutationCtx, identity: UserIdentity) {
  const organizationId = activeOrganization(identity);
  if (organizationId) {
    const business = await ctx.db.query("businesses")
      .withIndex("by_clerkOrgId", q => q.eq("clerkOrgId", organizationId)).unique();
    if (!business) return null;
    const membership = await ctx.db.query("users")
      .withIndex("by_clerkUserId_and_businessId", q => q.eq("clerkUserId", identity.subject).eq("businessId", business._id)).unique();
    if (!membership) throw new Error("FORBIDDEN: Organization membership is unavailable");
    return membership;
  }
  const preferred = await ctx.db.query("users")
    .withIndex("by_clerkUserId_and_isDefaultMembership", q => q.eq("clerkUserId", identity.subject).eq("isDefaultMembership", true)).unique();
  if (preferred) return preferred;
  // Compatibility for existing single-business identities or unflagged defaults.
  const memberships = await ctx.db.query("users")
    .withIndex("by_clerkUserId", q => q.eq("clerkUserId", identity.subject)).take(2);
  if (memberships.length > 1) {
    throw new Error("FORBIDDEN: Select a business before continuing");
  }
  return memberships[0] ?? null;
}

export async function requireUserAndBusiness(
  ctx: QueryCtx | MutationCtx
): Promise<AuthenticatedUser> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("UNAUTHENTICATED: Authentication required");
  const user = await findCurrentMembership(ctx, identity);
  if (!user) throw new Error("UNAUTHORIZED: Business membership not found");
  if (user.status !== "ACTIVE") throw new Error("FORBIDDEN: User account is suspended or inactive");
  const business = await ctx.db.get(user.businessId);
  if (!business) throw new Error("NOT_FOUND: Associated business profile not found");
  if (business.isActive === false) throw new Error("FORBIDDEN: Business is inactive");
  return {
    userId: identity.subject,
    email: user.email,
    userRecord: user,
    businessRecord: business,
    businessId: user.businessId,
  };
}


export async function requireSelectedBusiness(ctx: QueryCtx | MutationCtx, businessId: string, expectedUserId?: string) {
  const auth = await requireUserAndBusiness(ctx);
  if ((businessId !== auth.businessId && businessId !== auth.businessRecord.legacyPrismaBusinessId) ||
      (expectedUserId !== undefined && expectedUserId !== auth.userId)) {
    throw new Error("FORBIDDEN: Business or operator context changed");
  }
  return auth;
}
