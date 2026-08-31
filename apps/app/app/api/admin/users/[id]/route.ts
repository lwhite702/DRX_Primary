import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import { getPlatformAdmin } from "@/lib/auth/platform-admin";
import { updateUserRole } from "@/app/actions/user-management";

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id: targetUserId } = await params;
    const admin = await getPlatformAdmin();
    const actorId = admin?.userId;

    if (!actorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await request.json();
    const result = await updateUserRole(targetUserId, body.role, body.businessId);
    return NextResponse.json(result, { status: result.error ? 400 : 200 });
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
    const admin = await getPlatformAdmin();
    const actorId = admin?.userId;

    if (!actorId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
    if (targetUserId === actorId || await db.adminUser.findFirst({ where: { userId: targetUserId } })) {
      return NextResponse.json({ error: "Platform accounts cannot be deleted here" }, { status: 403 });
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
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
