import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { clerkClient } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import {
  isPrivilegedTeamRole,
  normalizeTeamRole,
  resolveTeamManagementContext,
} from "../_lib/server";

const INVITATION_TTL_DAYS = 7;
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function clerkErrorStatus(error: unknown): number | undefined {
  if (!error || typeof error !== "object") return undefined;
  const status = (error as { status?: unknown }).status;
  return typeof status === "number" ? status : undefined;
}

export async function POST(request: NextRequest) {
  const context = await resolveTeamManagementContext(request);
  if (!context.ok) {
    return NextResponse.json(
      { error: context.error },
      { status: context.status },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json(
      { error: "Invalid request body" },
      { status: 400 },
    );
  }

  const payload = body as Record<string, unknown>;
  const email =
    typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
  const name = typeof payload.name === "string" ? payload.name.trim() : "";
  const role = normalizeTeamRole(payload.role ?? "cashier");

  if (!EMAIL_PATTERN.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address" },
      { status: 400 },
    );
  }
  if (!role) {
    return NextResponse.json(
      { error: "Select a valid assignable role" },
      { status: 400 },
    );
  }
  if (isPrivilegedTeamRole(role) && !context.canManagePrivilegedRoles) {
    return NextResponse.json(
      { error: "Only an owner or administrator can invite an administrator" },
      { status: 403 },
    );
  }

  const now = new Date();
  const existingInvite = await db.invite.findFirst({
    where: {
      tenantId: context.businessId,
      email,
      status: "PENDING",
      expiresAt: { gt: now },
    },
    select: { id: true },
  });
  if (existingInvite) {
    return NextResponse.json(
      { error: "An active invitation already exists for this email" },
      { status: 409 },
    );
  }

  const existingUser = await db.user.findUnique({
    where: { email },
    select: { clerkUserId: true },
  });
  if (existingUser?.clerkUserId) {
    const existingMembership = await db.userRole.findFirst({
      where: {
        businessId: context.businessId,
        userId: existingUser.clerkUserId,
      },
      select: { id: true },
    });
    if (existingMembership) {
      return NextResponse.json(
        { error: "This user is already a member of the business" },
        { status: 409 },
      );
    }
  }

  let invitationId: string | null = null;
  try {
    const inviteToken = randomUUID();
    const client = await clerkClient();
    const invitation = await client.invitations.createInvitation({
      emailAddress: email,
      expiresInDays: INVITATION_TTL_DAYS,
      ignoreExisting: false,
      notify: true,
      publicMetadata: {
        drxBusinessId: context.businessId,
        drxInviteToken: inviteToken,
        drxRole: role,
        drxInvitedBy: context.userId,
        ...(name ? { drxInvitedName: name } : {}),
      },
    });
    invitationId = invitation.id;

    const expiresAt = new Date(
      now.getTime() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000,
    );
    await db.$transaction([
      db.invite.create({
        data: {
          email,
          token: inviteToken,
          tenantId: context.businessId,
          role,
          status: "PENDING",
          expiresAt,
          invitedBy: context.userId,
        },
      }),
      db.systemAuditLog.create({
        data: {
          action: "invite_member",
          entityId: invitation.id,
          userId: context.userId,
          businessId: context.businessId,
          newValues: { role },
          entityType: "team_invitation",
        },
      }),
    ]);

    return NextResponse.json(
      {
        id: invitation.id,
        email,
        role,
        status: "pending",
        expiresAt: expiresAt.toISOString(),
      },
      { status: 201 },
    );
  } catch (error) {
    if (invitationId) {
      try {
        const client = await clerkClient();
        await client.invitations.revokeInvitation(invitationId);
      } catch (revokeError) {
        console.error("Failed to revoke orphaned team invitation", {
          status: clerkErrorStatus(revokeError),
        });
      }
    }

    const status = clerkErrorStatus(error);
    console.error("Create team invitation failed", { status });
    if (status === 409 || status === 422) {
      return NextResponse.json(
        { error: "An invitation or account already exists for this email" },
        { status: 409 },
      );
    }
    return NextResponse.json(
      { error: "Failed to create invitation" },
      { status: 500 },
    );
  }
}
