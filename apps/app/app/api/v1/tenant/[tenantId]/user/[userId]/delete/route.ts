import { NextRequest, NextResponse } from "next/server";
import { clerkClient } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";
import { getPlatformAdmin } from "@/lib/auth/platform-admin";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string; userId: string }> },
) {
  try {
    const { tenantId, userId } = await params;
    const admin = await getPlatformAdmin();
    if (!admin) return NextResponse.json({ error: "Global identity deletion requires platform administration" }, { status: 403 });
    const actorId = admin.userId;
    const target = await db.userRole.findFirst({ where: { userId, businessId: tenantId }, select: { id: true } });
    if (!target || userId === actorId || await db.adminUser.findFirst({ where: { userId } })) {
      return NextResponse.json({ error: "Target is unavailable or protected" }, { status: 403 });
    }

    // 1. Log the initiation
    await db.systemAuditLog.create({
      data: {
        action: "rtbf_initiated",
        entityId: userId,
        entityType: "user",
        userId: actorId,
        newValues: { tenant_id: tenantId, status: "removal_initiated" },
        businessId: tenantId,
      },
    });

    // 2. Data Shredding / Deletion
    // We will perform a Hard Delete in Clerk which is the most compliant RTBF action.
    const client = await clerkClient();
    try {
      await client.users.deleteUser(userId);
    } catch (clerkError: any) {
      console.error("Clerk Delete User Failed:", clerkError);
      // Proceed? If user not found, maybe already deleted.
      if (clerkError.status !== 404) {
        return NextResponse.json(
          { error: "Failed to delete user in identity provider" },
          { status: 500 },
        );
      }
    }

    // 3. Remove from user_roles (Prisma)
    await db.userRole.deleteMany({
      where: {
        userId: userId,
        businessId: tenantId,
      },
    });

    // 4. Log completion
    await db.systemAuditLog.create({
      data: {
        action: "rtbf_completed",
        entityId: userId,
        entityType: "user",
        userId: actorId,
        businessId: tenantId,
      },
    });

    return NextResponse.json(
      { message: "User deleted, data removal initiated" },
      { status: 200 },
    );
  } catch (error) {
    console.error("RTBF API Error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
