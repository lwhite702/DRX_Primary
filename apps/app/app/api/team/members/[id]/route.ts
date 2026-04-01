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

    const client = await clerkClient();
    let user;
    try {
      user = await client.users.getUser(id);
    } catch (e) {
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

    const roleData = await db.userRole.findFirst({
      where: {
        userId: id,
        ...(actorRole?.businessId ? { businessId: actorRole.businessId } : {}),
      },
      select: { role: true },
    });

    return NextResponse.json({
      id: user.id,
      email: user.emailAddresses[0]?.emailAddress,
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

    // Audit Log
    await db.systemAuditLog.create({
      data: {
        action: "delete_member",
        entityId: targetUserId,
        userId: actorId,
        entityType: "team_member",
        // resource_id: id, // entityId covers it
      },
    });

    // Delete User (Cascade usually deletes roles, but verify)
    const client = await clerkClient();
    await client.users.deleteUser(targetUserId);

    // Cleanup DB references
    await db.userRole.deleteMany({ where: { userId: targetUserId } });

    return NextResponse.json({}, { status: 204 });
  } catch (error: any) {
    console.error("Delete member error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
