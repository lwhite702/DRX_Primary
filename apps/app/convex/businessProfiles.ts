import { v } from "convex/values";
import { z } from "zod";
import { mutation, query } from "./_generated/server";
import type { Doc } from "./_generated/dataModel";
import { requireUserAndBusiness } from "./helpers/auth";
import { requirePermission } from "./helpers/permissions";

export const businessProfileValidator = v.object({
    id: v.id("businesses"), clerkOrgId: v.union(v.string(), v.null()),
    businessName: v.string(), businessType: v.union(v.string(), v.null()),
    address: v.union(v.string(), v.null()), city: v.union(v.string(), v.null()),
    state: v.union(v.string(), v.null()), zipCode: v.union(v.string(), v.null()),
    phoneNumber: v.union(v.string(), v.null()), email: v.union(v.string(), v.null()),
    ownerId: v.string(), isActive: v.boolean(), createdAt: v.number(), updatedAt: v.number(),
  });
export function businessProfileDto(business: Doc<"businesses">) {
  return {
    id: business._id, clerkOrgId: business.clerkOrgId ?? null,
    businessName: business.name, businessType: business.businessType ?? null,
    address: business.address ?? null, city: business.city ?? null,
    state: business.state ?? null, zipCode: business.zipCode ?? null,
    phoneNumber: business.phoneNumber ?? null, email: business.email ?? null,
    ownerId: business.ownerId, isActive: business.isActive !== false,
    createdAt: business.createdAt, updatedAt: business.updatedAt,
  };
}
const profilePatch = z.object({
  businessName: z.string().trim().min(1).max(255).optional(),
  businessType: z.string().max(100).optional(),
  address: z.string().optional(), city: z.string().max(100).optional(),
  state: z.string().max(50).optional(), zipCode: z.string().max(20).optional(),
  phoneNumber: z.string().max(20).optional(),
  email: z.union([z.literal(""), z.string().email().max(255)]).optional(),
}).strict();
function assertContext(auth: Awaited<ReturnType<typeof requireUserAndBusiness>>, businessId: string, expectedUserId?: string) {
  if ((businessId !== auth.businessId && businessId !== auth.businessRecord.legacyPrismaBusinessId) ||
      (expectedUserId && expectedUserId !== auth.userId)) throw new Error("FORBIDDEN: Business context changed or is unavailable");
}
export const getProfile = query({
  args: { businessId: v.string(), expectedUserId: v.optional(v.string()) },
  returns: businessProfileValidator,
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    assertContext(auth, args.businessId, args.expectedUserId);
    return businessProfileDto(auth.businessRecord);
  },
});
export const updateProfile = mutation({
  args: { businessId: v.string(), expectedUserId: v.optional(v.string()), patch: v.object({
    businessName: v.optional(v.string()), businessType: v.optional(v.string()),
    address: v.optional(v.string()), city: v.optional(v.string()), state: v.optional(v.string()),
    zipCode: v.optional(v.string()), phoneNumber: v.optional(v.string()), email: v.optional(v.string()),
  }) },
  returns: businessProfileValidator,
  handler: async (ctx, args) => {
    const auth = await requireUserAndBusiness(ctx);
    assertContext(auth, args.businessId, args.expectedUserId);
    requirePermission(auth.userRecord, "MANAGE_COMMERCE_SETTINGS");
    const parsed = profilePatch.safeParse(args.patch);
    if (!parsed.success) throw new Error("INVALID_ARGUMENT: Invalid business profile");
    const { businessName, ...contact } = parsed.data;
    const patch = { ...contact, ...(businessName !== undefined ? { name: businessName } : {}) };
    for (const key of Object.keys(patch) as Array<keyof typeof patch>) {
      if (patch[key] === undefined) delete patch[key];
    }
    const changedFields = Object.entries(patch).filter(([key, value]) => value !== undefined && auth.businessRecord[key as keyof Doc<"businesses">] !== value).map(([key]) => key);
    if (changedFields.length === 0) return businessProfileDto(auth.businessRecord);
    const updatedAt = Date.now();
    await ctx.db.patch(auth.businessId, { ...patch, updatedAt });
    await ctx.db.insert("auditEvents", {
      businessId: auth.businessId, userId: auth.userId, action: "BUSINESS_PROFILE_UPDATED",
      entityType: "business", entityId: auth.businessId,
      metadata: JSON.stringify({ changedFields }), timestamp: updatedAt,
    });
    return businessProfileDto({ ...auth.businessRecord, ...patch, updatedAt });
  },
});
