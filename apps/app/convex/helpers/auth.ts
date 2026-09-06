import { QueryCtx, MutationCtx } from "../_generated/server";
import { Doc, Id } from "../_generated/dataModel";

export interface AuthenticatedUser {
  userId: string;
  email: string;
  userRecord: Doc<"users">;
  businessRecord: Doc<"businesses">;
  businessId: Id<"businesses">;
}

export async function requireUserAndBusiness(
  ctx: QueryCtx | MutationCtx
): Promise<AuthenticatedUser> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) {
    throw new Error("UNAUTHENTICATED: Authentication required");
  }
  const clerkUserId = identity.subject;

  // Fetch user record
  const user = await ctx.db
    .query("users")
    .withIndex("by_clerkUserId", (q) => q.eq("clerkUserId", clerkUserId!))
    .unique();

  if (!user) {
    throw new Error(`UNAUTHORIZED: User record not found for clerkUserId '${clerkUserId}'`);
  }

  if (user.status !== "ACTIVE") {
    throw new Error("FORBIDDEN: User account is suspended or inactive");
  }

  // Fetch tenant business profile
  const business = await ctx.db.get(user.businessId);
  if (!business) {
    throw new Error("NOT_FOUND: Associated business profile not found");
  }

  if (business.isActive === false) throw new Error("FORBIDDEN: Business is inactive");

  return {
    userId: clerkUserId!,
    email: user.email,
    userRecord: user,
    businessRecord: business,
    businessId: user.businessId,
  };
}
