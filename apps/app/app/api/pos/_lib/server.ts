import { auth } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import { isAuthBypassEnabledServer } from "@/lib/auth/bypass";

export async function assertBusinessAccess(userId: string, businessId: string): Promise<boolean> {
  const owned = await db.businessProfile.findFirst({
    where: { ownerId: userId, id: businessId },
    select: { id: true },
  });
  if (owned) return true;

  const role = await db.userRole.findFirst({
    where: { userId, businessId },
    select: { id: true },
  });
  return !!role;
}

export async function resolveAuthContext(request?: Request | string) {
  const { userId, orgId } = await auth();
  if (!userId) {
    return { userId: null, businessId: null };
  }

  // 1. Try explicit business selection from request or string input
  let explicitBusinessId: string | null = null;
  if (typeof request === "string") {
    explicitBusinessId = request;
  } else if (request) {
    const headers = request.headers;
    const headerBusinessId = headers instanceof Headers ? headers.get("x-business-id") : (headers as any)?.["x-business-id"];
    if (headerBusinessId) {
      explicitBusinessId = headerBusinessId;
    } else {
      try {
        const url = new URL(request.url);
        const queryBusinessId = url.searchParams.get("businessId") || url.searchParams.get("business_id");
        if (queryBusinessId) {
          explicitBusinessId = queryBusinessId;
        }
      } catch (err) {
        // Ignore if invalid URL
      }
    }
  }

  if (explicitBusinessId) {
    const hasAccess = await assertBusinessAccess(userId, explicitBusinessId);
    return {
      userId,
      businessId: hasAccess ? explicitBusinessId : null,
    };
  }

  // 2. Try to resolve using active Clerk organization in session (explicit session selection)
  if (orgId) {
    const business = await db.businessProfile.findUnique({
      where: { clerkOrgId: orgId },
      select: { id: true },
    });
    if (business) {
      const hasAccess = await assertBusinessAccess(userId, business.id);
      return {
        userId,
        businessId: hasAccess ? business.id : null,
      };
    }
  }

  // 3. Fallback for personal account context (no active organization)
  // Lookup personal workspace via synthetic Clerk organization ID
  const personalBusiness = await db.businessProfile.findUnique({
    where: { clerkOrgId: `personal_${userId}` },
    select: { id: true },
  });
  if (personalBusiness) {
    return { userId, businessId: personalBusiness.id };
  }

  // 4. Fallback for testing/development bypass mode ONLY.
  // In production/staging, bypass is false, so it will never fall back to findFirst.
  const bypass = isAuthBypassEnabledServer();
  if (bypass) {
    const firstBusiness = await db.businessProfile.findFirst({
      orderBy: { createdAt: "desc" },
      select: { id: true },
    });
    if (firstBusiness) {
      return { userId, businessId: firstBusiness.id };
    }
  }

  return { userId, businessId: null };
}

export function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (value && typeof value === "object" && "toNumber" in value) {
    return (value as { toNumber: () => number }).toNumber();
  }
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function cleanPhone(value: string) {
  return value.replace(/[^0-9]/g, "");
}
