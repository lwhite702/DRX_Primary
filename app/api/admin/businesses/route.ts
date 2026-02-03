import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@clerk/nextjs/server";
import { db } from "@/lib/db";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { businessName, businessType, ownerEmail } = body;

    // 1. Verify Authentication & Admin Permissions
    const { userId: actorId } = await auth();

    if (!actorId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Check if user is admin (super_admin)
    const adminRole = await db.userRole.findFirst({
      where: {
        userId: actorId,
        role: "super_admin",
      },
    });

    if (!adminRole) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // 2. Client init
    const client = await clerkClient();

    // 3. Find Owner by Email
    const userList = await client.users.getUserList({
      emailAddress: [ownerEmail],
      limit: 1,
    });

    const owner = userList.data.length > 0 ? userList.data[0] : null;

    if (!owner) {
      return NextResponse.json(
        {
          error:
            "User with this email not found. Please ensure they have signed up first.",
        },
        { status: 404 },
      );
    }
    const ownerId = owner.id;

    // 4. Create Business Profile
    const business = await db.businessProfile.create({
      data: {
        businessName,
        businessType: businessType || null,
        ownerId: ownerId,
        isActive: true,
      },
    });

    // 5. Assign 'Owner' Role
    await db.userRole.create({
      data: {
        businessId: business.id,
        userId: ownerId,
        role: "owner",
        permissions: { all: true }, // Owners get all perms
      },
    });

    // 6. Create Default Settings
    await db.businessSettings.create({
      data: {
        businessId: business.id,
        currency: "USD",
        timezone: "America/New_York",
        settingsData: {
          default_tax_rate: 0.08,
        },
      },
    });

    return NextResponse.json({ success: true, business });
  } catch (error) {
    console.error("Create business API error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
