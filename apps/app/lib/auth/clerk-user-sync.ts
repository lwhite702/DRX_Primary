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

function displayName(payload: ClerkCreatedUserPayload, email: string) {
  const name = [payload.first_name, payload.last_name]
    .filter(Boolean)
    .join(" ")
    .trim();
  return name || email.split("@")[0];
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
    typeof metadata.drxBusinessId === "string"
      ? metadata.drxBusinessId
      : null;
  const inviteToken =
    typeof metadata.drxInviteToken === "string"
      ? metadata.drxInviteToken
      : null;

  if (invitedBusinessId || inviteToken) {
    if (!invitedBusinessId || !inviteToken) {
      throw new Error("Clerk invitation metadata is incomplete");
    }

    const invite = await db.invite.findFirst({
      where: {
        token: inviteToken,
        tenantId: invitedBusinessId,
        email,
      },
      select: {
        id: true,
        status: true,
        role: true,
        expiresAt: true,
        invitedBy: true,
      },
    });
    if (!invite) {
      throw new Error("DRX invitation record was not found");
    }
    if (invite.status === "ACCEPTED") {
      return "invitation_already_processed";
    }
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
    if (!role) {
      throw new Error("DRX invitation contains an invalid role");
    }

    const business = await db.businessProfile.findUnique({
      where: { id: invitedBusinessId },
      select: { id: true, isActive: true },
    });
    if (!business?.isActive) {
      throw new Error("Invited DRX business is unavailable");
    }

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
        existingUser.clerkUserId !== payload.id
      ) {
        throw new Error("Email is already mapped to another Clerk identity");
      }

      if (existingUser) {
        await tx.user.update({
          where: { id: existingUser.id },
          data: {
            clerkUserId: payload.id,
            name: displayName(payload, email),
            status: "ACTIVE",
          },
        });
      } else {
        await tx.user.create({
          data: {
            clerkUserId: payload.id,
            email,
            name: displayName(payload, email),
            role: role.toUpperCase(),
            status: "ACTIVE",
            tenantId: invitedBusinessId,
          },
        });
      }

      const existingMembership = await tx.userRole.findFirst({
        where: { businessId: invitedBusinessId, userId: payload.id },
        select: { id: true },
      });
      if (!existingMembership) {
        await tx.userRole.create({
          data: {
            businessId: invitedBusinessId,
            userId: payload.id,
            role,
            permissions: {},
          },
        });
      }

      await tx.systemAuditLog.create({
        data: {
          action: "accept_team_invitation",
          entityType: "team_member",
          entityId: payload.id,
          userId: payload.id,
          businessId: invitedBusinessId,
          newValues: { role, invitedBy: invite.invitedBy },
        },
      });

      return true;
    });

    return accepted
      ? "invitation_accepted"
      : "invitation_already_processed";
  }

  const result = await db.$transaction(async (tx: typeof db) => {
    const existingUser = await tx.user.findUnique({ where: { email } });
    if (existingUser) {
      if (
        existingUser.clerkUserId &&
        existingUser.clerkUserId !== payload.id
      ) {
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
