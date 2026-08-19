import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { hasBusinessPermission } from "@/lib/auth/server-guards";
import { db } from "@/lib/db";

const ASSIGNABLE_ROLES = new Set(["cashier", "supervisor", "manager"]);

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const { userId: actorId, businessId } = await resolveAuthContext(request);

  if (!actorId || !businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    if (!(await hasBusinessPermission(actorId, businessId, "staff.manage"))) {
      return NextResponse.json(
        { error: "Forbidden: Insufficient permissions" },
        { status: 403 },
      );
    }

    const body = await request.json();
    const role = typeof body.role === "string" ? body.role.toLowerCase() : "";
    if (!ASSIGNABLE_ROLES.has(role)) {
      return NextResponse.json(
        { error: "Role must be cashier, supervisor, or manager" },
        { status: 400 },
      );
    }

    const targetMembership = await db.userRole.findFirst({
      where: { userId: id, businessId },
      select: { id: true, role: true },
    });
    if (!targetMembership) {
      return NextResponse.json(
        { error: "User not found in this business" },
        { status: 404 },
      );
    }
    if (["owner", "super_admin"].includes(targetMembership.role || "")) {
      return NextResponse.json(
        { error: "Owner and super admin roles cannot be changed here" },
        { status: 403 },
      );
    }

    await db.userRole.update({
      where: { id: targetMembership.id },
      data: { role },
    });

    await db.systemAuditLog.create({
      data: {
        action: "role_update",
        entityId: id,
        userId: actorId,
        oldValues: { role: targetMembership.role },
        newValues: { role },
        entityType: "team_member",
        businessId,
      },
    });

    return NextResponse.json({ id, role }, { status: 200 });
  } catch (error) {
    console.error("Update role error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 },
    );
  }
}
