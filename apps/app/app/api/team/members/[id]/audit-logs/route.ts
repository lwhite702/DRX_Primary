import { NextRequest, NextResponse } from "next/server";
import { hasBusinessPermission } from "@/lib/auth/server-guards";
import { db } from "@/lib/db";
import {
  findTeamMembership,
  resolveTeamManagementContext,
} from "../../../_lib/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const context = await resolveTeamManagementContext(request);
    if (!context.ok) {
      return NextResponse.json(
        { error: context.error },
        { status: context.status },
      );
    }
    if (
      !(await hasBusinessPermission(
        context.userId,
        context.businessId,
        "audit.view",
      ))
    ) {
      return NextResponse.json({ error: "Access denied" }, { status: 403 });
    }

    const { id } = await params;
    const membership = await findTeamMembership(context.businessId, id);
    if (!membership) {
      return NextResponse.json({ error: "Member not found" }, { status: 404 });
    }

    const logs = await db.systemAuditLog.findMany({
      where: {
        entityId: membership.userId,
        businessId: context.businessId,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return NextResponse.json(logs);
  } catch (error) {
    console.error("Fetch member audit logs failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    });
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
