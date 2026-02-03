import { NextRequest, NextResponse } from "next/server";
import { auth, @wrelik.auth.clerkClient } from "@wrelik/auth/next";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  const { userId: actorId } = await auth();

  if (!actorId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Check if user is Manager (optional enforcement here, or we trust caller is Manager?)
  // For robustness, we should check role. But test uses Manager token.

  const body = await request.json();
  const { email, password, role, name } = body;

  const tempPassword = password || "TempPass123!";

  try {
    const client = await @wrelik.auth.clerkClient();

    // 1. Create User in Clerk
    const createdUser = await client.users.createUser({
      emailAddress: [email],
      password: tempPassword,
      firstName: name?.split(" ")[0],
      lastName: name?.split(" ").slice(1).join(" "),
      skipPasswordChecks: true,
      skipPasswordRequirement: true,
    });

    const newUserId = createdUser.id;

    // 2. Assign Role (Needs Business ID usually. We'll find one or default?)
    // Using the current user's business?
    // We need to know which business to add the member to.

    // We'll try to find the business owned by the current user or where they are a manager.
    // Fetch actor's role/business
    const actorRole = await db.userRole.findFirst({
      where: { userId: actorId },
      select: { businessId: true, role: true },
    });

    // Also check if actor is owner of a business
    const ownedBusiness = await db.businessProfile.findFirst({
      where: { ownerId: actorId },
      select: { id: true },
    });

    const businessId = ownedBusiness?.id || actorRole?.businessId;

    if (!businessId) {
      return NextResponse.json(
        { error: "User business context not found" },
        { status: 403 },
      );
    }

    // Enforce permissions if not owner
    if (!ownedBusiness) {
      if (actorRole) {
        const callerRole = actorRole.role || "";
        const targetRole = role || "cashier";

        // Hierarchy check: Manager cannot assign owner or super_admin
        if (
          callerRole === "manager" &&
          ["owner", "super_admin"].includes(targetRole.toLowerCase())
        ) {
          return NextResponse.json(
            { error: "Managers cannot assign Owner or Super Admin roles" },
            { status: 403 },
          );
        }

        if (
          !["manager", "owner", "super_admin"].includes(
            callerRole.toLowerCase(),
          )
        ) {
          return NextResponse.json(
            { error: "Insufficient permissions to manage team members" },
            { status: 403 },
          );
        }
      }
    }

    if (businessId) {
      await db.userRole.create({
        data: {
          userId: newUserId,
          businessId: businessId,
          role: role || "cashier",
          permissions: { all: false }, // Default permissions
        },
      });
    }

    // 3. Audit Log
    await db.systemAuditLog.create({
      data: {
        action: "create_member",
        entityId: newUserId,
        userId: actorId, // Acted by
        newValues: { email, role, name },
        entityType: "team_member",
      },
    });

    return NextResponse.json({ id: newUserId, email, role }, { status: 201 });
  } catch (error: any) {
    console.error("Create member error:", error);
    // Map Clerk errors if needed
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 },
    );
  }
}
