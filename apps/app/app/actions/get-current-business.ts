"use server";

import { auth, isAuthBypassEnabled } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";

function isMissingColumnError(error: unknown) {
  return Boolean(
    error &&
      typeof error === "object" &&
      "code" in error &&
      (error as { code?: string }).code === "P2022",
  );
}

const businessProfileSelect = {
  id: true,
  businessName: true,
  businessType: true,
  address: true,
  city: true,
  state: true,
  zipCode: true,
  phoneNumber: true,
  email: true,
  ownerId: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} as const;

export async function getCurrentBusinessProfile() {
  try {
    const { orgId, userId } = await auth();
    const bypass = isAuthBypassEnabled();

    if (orgId && !bypass) {
      try {
        const byOrg = await db.businessProfile.findUnique({
          where: { clerkOrgId: orgId },
          select: businessProfileSelect,
        });
        if (byOrg) return { ...byOrg, clerkOrgId: orgId };
      } catch (error: any) {
        // Some local databases are missing the newer clerk_org_id column.
        // Fall back to ownerId lookup instead of hard-failing local testing.
        if (!isMissingColumnError(error)) {
          throw error;
        }
      }
    }

    if (bypass && userId) {
      try {
        const byOwner = await db.businessProfile.findFirst({
          where: { ownerId: userId },
          orderBy: { createdAt: "desc" },
          select: businessProfileSelect,
        });
        if (byOwner) return { ...byOwner, clerkOrgId: null };
      } catch (error) {
        // Older local schemas may also miss ownerId or related columns.
        // In bypass mode, prefer a best-effort local profile instead of repeated request failures.
        if (!isMissingColumnError(error)) {
          throw error;
        }
      }

      try {
        const firstProfile = await db.businessProfile.findFirst({
          orderBy: { createdAt: "desc" },
          select: businessProfileSelect,
        });
        if (firstProfile) return { ...firstProfile, clerkOrgId: null };
      } catch (error) {
        if (!isMissingColumnError(error)) {
          throw error;
        }
      }
    }

    return null;
  } catch (error) {
    console.error("Error fetching current business profile:", error);
    return null;
  }
}
