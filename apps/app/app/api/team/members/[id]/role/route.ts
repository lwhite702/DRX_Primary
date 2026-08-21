import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import {
  isRealClerkOrganizationId,
  toClerkOrganizationRole,
} from "@/lib/team/clerk-organization";
import {
  findTeamMembership,
  isPrivilegedTeamRole,
  normalizeTeamRole,
  resolveTeamManagementContext,
} from "../../../_lib/server";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
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

    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json(
        { error: "Invalid request body" },
        { status: 400 },
      );
    }

    const role = normalizeTeamRole((body as Record<string, unknown>).role);
    if (!role) {
      return NextResponse.json(
        { error: "Select a valid assignable role" },
        { status: 400 },
      );
    }
    if (isPrivilegedTeamRole(role) && !context.canManagePrivilegedRoles) {
      return NextResponse.json(
        { error: "Only an owner or administrator can assign that role" },
        { status: 403 },
      );
    }

    const { id } = await params;
    const membership = await findTeamMembership(context.businessId, id);
    if (!membership) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (membership.userId === context.userId) {
      return NextResponse.json(
        { error: "You cannot change your own role" },
        { status: 409 },
      );
    }
    if (membership.userId === context.ownerId || membership.role === "owner") {
      return NextResponse.json(
        { error: "The business owner role cannot be changed" },
        { status: 403 },
      );
    }
    if (
      isPrivilegedTeamRole(membership.role) &&
      !context.canManagePrivilegedRoles
    ) {
      return NextResponse.json(
        { error: "Only an owner or administrator can manage that role" },
        { status: 403 },
      );
    }

    let clerkRoleUpdated = false;
    let clerkMembershipCreated = false;
    if (isRealClerkOrganizationId(context.clerkOrgId)) {
      const client = await clerkClient();
      try {
        await client.organizations.updateOrganizationMembership({
          organizationId: context.clerkOrgId!,
          userId: membership.userId,
          role: toClerkOrganizationRole(role),
        });
        clerkRoleUpdated = true;
      } catch (error) {
        const status =
          error && typeof error === "object" && "status" in error
            ? (error as { status?: number }).status
            : undefined;
        if (status !== 404) throw error;
        await client.organizations.createOrganizationMembership({
          organizationId: context.clerkOrgId!,
          userId: membership.userId,
          role: toClerkOrganizationRole(role),
        });
        clerkMembershipCreated = true;
      }
    }

    try {
      await db.$transaction([
        db.userRole.update({
          where: { id: membership.id },
          data: { role },
        }),
        db.systemAuditLog.create({
          data: {
            action: "role_update",
            entityId: membership.userId,
            userId: context.userId,
            businessId: context.businessId,
            entityType: "team_member",
            oldValues: { role: membership.role },
            newValues: { role },
          },
        }),
      ]);
    } catch (error) {
      if (context.clerkOrgId && (clerkRoleUpdated || clerkMembershipCreated)) {
        try {
          const client = await clerkClient();
          if (clerkMembershipCreated) {
            await client.organizations.deleteOrganizationMembership({
              organizationId: context.clerkOrgId,
              userId: membership.userId,
            });
          } else {
            await client.organizations.updateOrganizationMembership({
              organizationId: context.clerkOrgId,
              userId: membership.userId,
              role: toClerkOrganizationRole(membership.role ?? "staff"),
            });
          }
        } catch (compensationError) {
          console.error("Restore Clerk organization role failed", {
            errorType:
              compensationError instanceof Error
                ? compensationError.name
                : "UnknownError",
          });
        }
      }
      throw error;
    }

    return NextResponse.json({ id: membership.userId, role }, { status: 200 });
  } catch (error) {
    console.error("Update team role failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
