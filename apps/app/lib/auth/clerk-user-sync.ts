import { db } from "@/lib/db";
import { normalizeTeamRole } from "@/lib/team/roles";

export type ClerkCreatedUserPayload = {
  id: string;
  email_addresses: Array<{ email_address: string }>;
  first_name?: string | null;
  last_name?: string | null;
  public_metadata?: Record<string, unknown> | null;
};

export type ClerkUserSyncResult =
  | "invitation_accepted"
  | "invitation_already_processed"
  | "invitation_expired"
  | "personal_workspace_created"
  | "user_already_synced";

export type ClerkAcceptedOrganizationInvitationPayload = {
  email_address: string;
  organization_id: string;
  user_id: string;
  public_metadata?: Record<string, unknown> | null;
};

export type ClerkOrganizationMembershipPayload = {
  organization: { id: string };
  public_user_data: {
    user_id: string;
    identifier: string;
    first_name?: string | null;
    last_name?: string | null;
  };
};

export type ClerkOrganizationSyncResult =
  | "invitation_accepted"
  | "invitation_already_processed"
  | "invitation_expired"
  | "invitation_not_found"
  | "organization_unmapped";

type InviteAcceptanceResult = Exclude<
  ClerkOrganizationSyncResult,
  "organization_unmapped"
>;

function displayName(payload: ClerkCreatedUserPayload, email: string) {
  const name = [payload.first_name, payload.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || email.split("@")[0];
}

async function acceptTeamInvitation(params: {
  userId: string;
  email: string;
  firstName?: string | null;
  lastName?: string | null;
  businessId: string;
  inviteToken?: string;
}): Promise<InviteAcceptanceResult> {
  const email = params.email.trim().toLowerCase();
  const invite = await db.invite.findFirst({
    where: {
      ...(params.inviteToken ? { token: params.inviteToken } : {}),
      tenantId: params.businessId,
      email,
    },
    select: {
      id: true,
      status: true,
      role: true,
      expiresAt: true,
      invitedBy: true,
    },
    ...(!params.inviteToken ? { orderBy: { createdAt: "desc" as const } } : {}),
  });
  if (!invite) return "invitation_not_found";
  if (invite.status === "ACCEPTED") return "invitation_already_processed";
  if (invite.status !== "PENDING" || invite.expiresAt <= new Date()) {
    if (invite.status === "PENDING") {
      await db.invite.updateMany({
        where: { id: invite.id, status: "PENDING" },
        data: { status: "EXPIRED" },
      });
    }
    return "invitation_expired";
  }

  const role = normalizeTeamRole(invite.role);
  if (!role) throw new Error("DRX invitation contains an invalid role");

  const business = await db.businessProfile.findUnique({
    where: { id: params.businessId },
    select: { id: true, isActive: true },
  });
  if (!business?.isActive) {
    throw new Error("Invited DRX business is unavailable");
  }

  const name =
    [params.firstName, params.lastName].filter(Boolean).join(" ").trim() ||
    email.split("@")[0];
  const accepted = await db.$transaction(async (tx: typeof db) => {
    const claimed = await tx.invite.updateMany({
      where: {
        id: invite.id,
        status: "PENDING",
        expiresAt: { gt: new Date() },
      },
      data: { status: "ACCEPTED" },
    });
    if (claimed.count !== 1) return false;

    const existingUser = await tx.user.findUnique({ where: { email } });
    if (
      existingUser?.clerkUserId &&
      existingUser.clerkUserId !== params.userId
    ) {
      throw new Error("Email is already mapped to another Clerk identity");
    }
    if (existingUser) {
      await tx.user.update({
        where: { id: existingUser.id },
        data: { clerkUserId: params.userId, name, status: "ACTIVE" },
      });
    } else {
      await tx.user.create({
        data: {
          clerkUserId: params.userId,
          email,
          name,
          role: role.toUpperCase(),
          status: "ACTIVE",
          tenantId: params.businessId,
        },
      });
    }

    const existingMembership = await tx.userRole.findFirst({
      where: { businessId: params.businessId, userId: params.userId },
      select: { id: true },
    });
    if (!existingMembership) {
      await tx.userRole.create({
        data: {
          businessId: params.businessId,
          userId: params.userId,
          role,
          permissions: {},
        },
      });
    }

    await tx.systemAuditLog.create({
      data: {
        action: "accept_team_invitation",
        entityType: "team_member",
        entityId: params.userId,
        userId: params.userId,
        businessId: params.businessId,
        newValues: { role, invitedBy: invite.invitedBy },
      },
    });
    return true;
  });

  return accepted ? "invitation_accepted" : "invitation_already_processed";
}

export async function syncAcceptedClerkOrganizationInvitation(
  payload: ClerkAcceptedOrganizationInvitationPayload,
): Promise<ClerkOrganizationSyncResult> {
  const metadata = payload.public_metadata ?? {};
  const businessId =
    typeof metadata.drxBusinessId === "string" ? metadata.drxBusinessId : null;
  const inviteToken =
    typeof metadata.drxInviteToken === "string"
      ? metadata.drxInviteToken
      : null;
  if (!businessId || !inviteToken) {
    throw new Error("Clerk organization invitation metadata is incomplete");
  }

  const business = await db.businessProfile.findFirst({
    where: { id: businessId, clerkOrgId: payload.organization_id },
    select: { id: true },
  });
  if (!business) {
    throw new Error(
      "Clerk organization invitation does not match DRX business",
    );
  }

  return acceptTeamInvitation({
    userId: payload.user_id,
    email: payload.email_address,
    businessId,
    inviteToken,
  });
}

export async function syncCreatedClerkOrganizationMembership(
  payload: ClerkOrganizationMembershipPayload,
): Promise<ClerkOrganizationSyncResult> {
  const business = await db.businessProfile.findUnique({
    where: { clerkOrgId: payload.organization.id },
    select: { id: true },
  });
  if (!business) return "organization_unmapped";

  const identifier = payload.public_user_data.identifier.trim().toLowerCase();
  if (!identifier.includes("@")) return "invitation_not_found";
  return acceptTeamInvitation({
    userId: payload.public_user_data.user_id,
    email: identifier,
    firstName: payload.public_user_data.first_name,
    lastName: payload.public_user_data.last_name,
    businessId: business.id,
  });
}

export async function syncCreatedClerkUser(
  payload: ClerkCreatedUserPayload,
): Promise<ClerkUserSyncResult> {
  const email = payload.email_addresses[0]?.email_address?.trim().toLowerCase();
  if (!email) {
    throw new Error("Clerk user.created event is missing an email address");
  }

  const metadata = payload.public_metadata ?? {};
  const invitedBusinessId =
    typeof metadata.drxBusinessId === "string" ? metadata.drxBusinessId : null;
  const inviteToken =
    typeof metadata.drxInviteToken === "string"
      ? metadata.drxInviteToken
      : null;

  if (invitedBusinessId || inviteToken) {
    if (!invitedBusinessId || !inviteToken) {
      throw new Error("Clerk invitation metadata is incomplete");
    }

    const result = await acceptTeamInvitation({
      userId: payload.id,
      email,
      firstName: payload.first_name,
      lastName: payload.last_name,
      businessId: invitedBusinessId,
      inviteToken,
    });
    if (result === "invitation_not_found") {
      throw new Error("DRX invitation record was not found");
    }
    return result;
  }

  const result = await db.$transaction(async (tx: typeof db) => {
    const existingUser = await tx.user.findUnique({ where: { email } });
    if (existingUser) {
      if (existingUser.clerkUserId && existingUser.clerkUserId !== payload.id) {
        throw new Error("Email is already mapped to another Clerk identity");
      }
      if (!existingUser.clerkUserId) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: { clerkUserId: payload.id },
        });
      }
      return "user_already_synced" as const;
    }

    const clerkOrgId = `personal_${payload.id}`;
    const existingWorkspace = await tx.businessProfile.findUnique({
      where: { clerkOrgId },
      select: { id: true },
    });
    const workspace =
      existingWorkspace ??
      (await tx.businessProfile.create({
        data: {
          businessName: `${displayName(payload, email)}'s Workspace`,
          ownerId: payload.id,
          clerkOrgId,
        },
        select: { id: true },
      }));

    await tx.user.create({
      data: {
        clerkUserId: payload.id,
        email,
        name: displayName(payload, email),
        role: "OWNER",
        tenantId: workspace.id,
      },
    });
    return "personal_workspace_created" as const;
  });

  return result;
}
