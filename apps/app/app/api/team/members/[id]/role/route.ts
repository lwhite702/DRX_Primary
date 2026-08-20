import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import {
  findTeamMembership,
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

    const role = normalizeTeamRole((body as Record<string, unknown>).role);
    if (!role) {
      return NextResponse.json(
        { error: "Select a valid assignable role" },
        { status: 400 },
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
