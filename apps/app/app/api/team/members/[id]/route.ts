import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import {
  findTeamMembership,
  resolveTeamManagementContext,
} from "../../_lib/server";

type RouteContext = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const context = await resolveTeamManagementContext(request);
    if (!context.ok) {
      return NextResponse.json(
        { error: context.error },
        { status: context.status },
      );
    }

    const { id } = await params;
    const membership = await findTeamMembership(context.businessId, id);
    if (!membership) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const localUser = await db.user.findFirst({
      where: {
        OR: [{ clerkUserId: membership.userId }, { id: membership.userId }],
      },
      select: { email: true, name: true },
    });

    let email = localUser?.email ?? "Unknown";
    let name = localUser?.name ?? null;
    if (!localUser) {
      try {
        const client = await clerkClient();
        const clerkUser = await client.users.getUser(membership.userId);
        email = clerkUser.primaryEmailAddress?.emailAddress ?? "Unknown";
        name =
          [clerkUser.firstName, clerkUser.lastName]
            .filter(Boolean)
            .join(" ") || null;
      } catch {
        // A missing identity should not expose data outside the scoped membership.
      }
    }

    return NextResponse.json({
      id: membership.id,
      user_id: membership.userId,
      business_id: context.businessId,
      email,
      name,
      role: membership.role,
      permissions: membership.permissions,
      created_at: membership.createdAt,
      updated_at: membership.updatedAt,
    });
  } catch (error) {
    console.error("Get team member failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const context = await resolveTeamManagementContext(request);
    if (!context.ok) {
      return NextResponse.json(
        { error: context.error },
        { status: context.status },
      );
    }

    const { id } = await params;
    const membership = await findTeamMembership(context.businessId, id);
    if (!membership) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }
    if (membership.userId === context.userId) {
      return NextResponse.json(
        { error: "You cannot remove your own membership" },
        { status: 409 },
      );
    }
    if (membership.userId === context.ownerId || membership.role === "owner") {
      return NextResponse.json(
        { error: "The business owner cannot be removed" },
        { status: 409 },
      );
    }

    await db.$transaction([
      db.systemAuditLog.create({
        data: {
          action: "remove_member",
          entityId: membership.userId,
          userId: context.userId,
          businessId: context.businessId,
          entityType: "team_member",
          oldValues: { role: membership.role },
        },
      }),
      db.userRole.delete({ where: { id: membership.id } }),
    ]);

    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Remove team member failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
