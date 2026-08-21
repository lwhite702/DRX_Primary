import { db } from "@/lib/db";

type ClerkOrganizationsApi = {
  createOrganization: (params: {
    name: string;
    createdBy: string;
  }) => Promise<{ id: string }>;
  createOrganizationMembership: (params: {
    organizationId: string;
    userId: string;
    role: "org:admin" | "org:member";
  }) => Promise<unknown>;
  deleteOrganization: (organizationId: string) => Promise<unknown>;
};

export function isRealClerkOrganizationId(value: string | null | undefined) {
  return Boolean(value && !value.startsWith("personal_"));
}

export function toClerkOrganizationRole(role: string) {
  return role === "admin" || role === "owner" || role === "super_admin"
    ? ("org:admin" as const)
    : ("org:member" as const);
}

export async function ensureClerkOrganization(params: {
  organizations: ClerkOrganizationsApi;
  businessId: string;
  businessName: string;
  ownerId: string;
  clerkOrgId: string | null;
}) {
  if (isRealClerkOrganizationId(params.clerkOrgId)) {
    return params.clerkOrgId as string;
  }

  const created = await params.organizations.createOrganization({
    name: params.businessName,
    createdBy: params.ownerId,
  });

  try {
    const existingMemberships: Array<{
      userId: string;
      role: string | null;
    }> = await db.userRole.findMany({
      where: { businessId: params.businessId },
      select: { userId: true, role: true },
    });
    const uniqueMembers = new Map(
      existingMemberships
        .filter((membership) => membership.userId !== params.ownerId)
        .map((membership) => [membership.userId, membership]),
    );
    for (const membership of uniqueMembers.values()) {
      await params.organizations.createOrganizationMembership({
        organizationId: created.id,
        userId: membership.userId,
        role: toClerkOrganizationRole(membership.role ?? "staff"),
      });
    }

    const bound = await db.businessProfile.updateMany({
      where: {
        id: params.businessId,
        clerkOrgId: params.clerkOrgId,
      },
      data: { clerkOrgId: created.id },
    });
    if (bound.count === 1) return created.id;

    const current = await db.businessProfile.findUnique({
      where: { id: params.businessId },
      select: { clerkOrgId: true },
    });
    if (current?.clerkOrgId === created.id) return created.id;
    if (isRealClerkOrganizationId(current?.clerkOrgId)) {
      await params.organizations.deleteOrganization(created.id);
      return current!.clerkOrgId as string;
    }

    throw new Error("Business could not be linked to a Clerk organization");
  } catch (error) {
    const current = await db.businessProfile.findUnique({
      where: { id: params.businessId },
      select: { clerkOrgId: true },
    });
    if (current?.clerkOrgId !== created.id) {
      try {
        await params.organizations.deleteOrganization(created.id);
      } catch (cleanupError) {
        console.error("Failed to remove unbound Clerk organization", {
          errorType:
            cleanupError instanceof Error ? cleanupError.name : "UnknownError",
        });
      }
    }
    throw error;
  }
}
