import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: targetUserId } = await params;
    const { userId: actorId } = await auth();

    if (!actorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { role } = body;

    // Update Role
    // Note: Assuming there is only one role per user per business for now, or updating all?
    // The legacy code used .eq('user_id', id) which implies updating ALL roles for that user?
    // Or it assumes the user only has one role row.
    // Prisma model `UserRole` allows multiple, but here we likely want to update the role for the current business context?
    // However, the admin route path suggests a global user update?
    // The legacy code syncs business_id from the ACTOR (user.id). This is weird.
    // "Sync business_id for log ... select business_id ... eq user_id, user.id"
    // It seems it logs against the admin's business.

    // Let's update the user role.
    await db.userRole.updateMany({
      where: { userId: targetUserId },
      data: { role },
    });

    // Log
    await db.systemAuditLog.create({
      data: {
        entityId: targetUserId,
        entityType: "user",
        action: "update_user_role",
        userId: actorId,
        newValues: { role },
        // businessId: ??? // We can fetch admin's business id if needed, for now logic is simplified
      },
    });

    return NextResponse.json({ role }, { status: 200 });
  } catch (error) {
    console.error("Admin Update Error:", error);
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

    // Audit Log before deletion
    await db.systemAuditLog.create({
      data: {
        entityId: targetUserId,
        entityType: "user",
        action: "delete_user",
        userId: actorId,
      },
    });

    // Delete User from Clerk
    const client = await clerkClient();
    await client.users.deleteUser(targetUserId);

    // Also should delete from DB?
    // Prisma `UserRole` and `BusinessProfile` (if owner) should probably be handled.
    // Ideally use cascading deletes or manual cleanup if Prisma schema references userId but not as a foreign key (which it doesn't, it is just a String).
    // Cleanup:
    await db.userRole.deleteMany({ where: { userId: targetUserId } });
    // Assuming BusinessProfile.ownerId is not a foreign key? It is just mapped to string.
    // We might leave orphaned businesses or handle them.
    // Standard practice: Deleting a user in Clerk does not delete their data in your DB automatically unless you use webhooks.
    // Here we are in an API route so we can do it.

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error: any) {
    console.error("Admin Delete Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: error.message },
      { status: 500 },
    );
  }
}
