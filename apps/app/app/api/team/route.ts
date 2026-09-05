import { NextRequest, NextResponse } from "next/server";
import type { UserRole } from "@prisma/client";
import { resolveTeamManagementContext } from "./_lib/server";
import { clerkClient } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  try {
    const context = await resolveTeamManagementContext(request);
    if (!context.ok) {
      return NextResponse.json(
        { error: context.error },
        { status: context.status },
      );
    }

    const business_id = context.businessId;

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
    console.error("Team API request failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
