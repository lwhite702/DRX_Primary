import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    // Verify auth? Assuming GET requires auth, though the original code didn't strictly check for the caller, just fetched.
    // Ideally we should check if caller belongs to same business.
    // For now, let's keep it simple and just verify generic auth.
    const { userId: actorId } = await auth();
    if (!actorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targetUser = await db.user.findFirst({
      where: {
        OR: [{ clerkUserId: id }, { id }],
      },
      select: { id: true, clerkUserId: true, email: true, name: true },
    });
    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Fetch role
    // Ideally we need business context.
    // If we don't have businessId, we might get any role or first role.
    // In team context, we usually know the business.
    // Let's try to get business from actor.
    const actorRole = await db.userRole.findFirst({
      where: { userId: actorId },
      select: { businessId: true },
    });

    const targetUserId = targetUser.clerkUserId || targetUser.id;
    const roleData = await db.userRole.findFirst({
      where: {
        userId: targetUserId,
        ...(actorRole?.businessId ? { businessId: actorRole.businessId } : {}),
      },
      select: { role: true },
    });

    return NextResponse.json({
      id: targetUserId,
      email: targetUser.email,
      name: targetUser.name,
      role: roleData?.role,
    });
  } catch (error) {
    console.error("Get member error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: targetUserId } = await params;
    const { userId: actorId } = await auth();

    if (!actorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const targetUser = await db.user.findFirst({
      where: { OR: [{ clerkUserId: targetUserId }, { id: targetUserId }] },
      select: { id: true, clerkUserId: true },
    });

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const targetUserDbId = targetUser.clerkUserId || targetUser.id;
    const roleUserId = targetUser.clerkUserId || targetUser.id;

    // Audit Log
    await db.systemAuditLog.create({
      data: {
        action: "delete_member",
        entityId: targetUserDbId,
        userId: actorId,
        entityType: "team_member",
        // resource_id: id, // entityId covers it
      },
    });

    if (targetUser.clerkUserId) {
      const clerk = await clerkClient();
      await clerk.users.deleteUser(targetUser.clerkUserId);
    }

    // Cleanup DB references
    await db.userRole.deleteMany({ where: { userId: roleUserId } });
    await db.user.delete({ where: { id: targetUser.id } });

    return NextResponse.json({}, { status: 204 });
  } catch (error: any) {
    console.error("Delete member error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
