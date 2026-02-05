import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId: actorId } = await auth();

  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Get Caller Role
    const callerRoleRec = await db.userRole.findFirst({
      where: { userId: actorId },
    });

    if (
      !callerRoleRec ||
      !["manager", "owner", "super_admin"].includes(callerRoleRec.role || "")
    ) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient permissions" },
        { status: 403 },
      );
    }

    const businessId = callerRoleRec.businessId;
    const body = await request.json();
    const { role } = body;
    const callerRole = callerRoleRec.role?.toLowerCase() || "";
    const targetRole = role.toLowerCase();

    // Enforce Role Hierarchy
    if (
      callerRole === "manager" &&
      ["owner", "super_admin"].includes(targetRole)
    ) {
      return NextResponse.json(
        { error: "Managers cannot assign Owner or Super Admin roles" },
        { status: 403 },
      );
    }

    // Update Role
    // Scope to businessId to prevent cross-tenant modification if needed, though 'id' is user_id globally?
    // Since `user_roles` has `{userId, businessId}` and user might have multiple roles...
    // We should update the role for THIS business context.

    const updateResult = await db.userRole.updateMany({
      where: {
        userId: id,
        businessId: businessId, // Ensure we only update role in the actor's business
      },
      data: { role: role },
    });

    if (updateResult.count === 0) {
      // If no role found, maybe we should create it? Or user not in business.
      return NextResponse.json(
        { error: "User not found in this business" },
        { status: 404 },
      );
    }

    // Audit Log
    await db.systemAuditLog.create({
      data: {
        action: "role_update",
        entityId: id,
        userId: actorId,
        newValues: { new_role: role },
        entityType: "team_member",
        businessId: businessId,
      },
    });

    return NextResponse.json({ id, role }, { status: 200 });
  } catch (error: any) {
    console.error("Update role error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
