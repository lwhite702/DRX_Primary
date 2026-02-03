import { NextRequest, NextResponse } from "next/server";
import { auth, @wrelik.auth.clerkClient } from "@wrelik/auth/next";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const { userId: actorId } = await auth();

    if (!actorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { username, email, role } = body;

    // 1. Create User in Clerk
    const client = await @wrelik.auth.clerkClient();
    const newUser = await client.users.createUser({
      emailAddress: [email],
      password: "TempPassword123!",
      username: username,
      firstName: username, // approximate
      skipPasswordChecks: true,
      skipPasswordRequirement: true,
    });

    if (!newUser) {
      return NextResponse.json(
        { error: "Creation failed (no user returned)" },
        { status: 500 },
      );
    }

    // Assign Role (via user_roles)
    // Find business owner's business? The legacy code fetched via 'owner_id = user.id' (actor).
    // So if the actor is an owner, we use their business.
    const business = await db.businessProfile.findFirst({
      where: { ownerId: actorId },
      select: { id: true },
    });

    const businessId = business?.id;

    if (businessId) {
      await db.userRole.create({
        data: {
          userId: newUser.id,
          businessId: businessId,
          role: role || "employee",
          permissions: { all: false },
        },
      });
    }

    // Log to system_audit_log
    await db.systemAuditLog.create({
      data: {
        entityId: newUser.id,
        entityType: "user",
        action: "create_user",
        userId: actorId,
        newValues: { username, email, role },
        // businessId: businessId
      },
    });

    return NextResponse.json({ id: newUser.id }, { status: 201 });
  } catch (error) {
    console.error("Create admin user error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
