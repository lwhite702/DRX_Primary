import { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { clerkClient } from "@/lib/adapters/auth/server";
import { hasBusinessPermission } from "@/lib/auth/server-guards";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext(request);
    if (!userId || !businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const business_id = businessId;
    if (!(await hasBusinessPermission(userId, business_id, "staff.manage"))) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const teamRoles = await db.userRole.findMany({
      where: { businessId: business_id },
      orderBy: { createdAt: "desc" },
    });
    const client = await clerkClient();
    const userDetails = await Promise.all(
      teamRoles.map(async (member: UserRole) => {
        try {
          const user = await client.users.getUser(member.userId);
          return {
            id: member.userId,
            email: user.primaryEmailAddress?.emailAddress ?? "Unknown",
            phone: user.primaryPhoneNumber?.phoneNumber ?? "",
          };
        } catch {
          return { id: member.userId, email: "Unknown", phone: "" };
        }
      }),
    );

    const enrichedTeam = teamRoles.map((member: UserRole) => {
      const details = userDetails.find((user) => user.id === member.userId);
      return {
        id: member.id,
        business_id: member.businessId,
        user_id: member.userId,
        role: member.role,
        permissions: member.permissions,
        created_at: member.createdAt,
        updated_at: member.updatedAt,
        email: details?.email || "Unknown",
        phone: details?.phone || "",
      };
    });

    return NextResponse.json({ success: true, data: enrichedTeam });
  } catch (error) {
    console.error("Team API Error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Internal Server Error",
      },
      { status: 500 }
    );
  }
}
