import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { teamClient, teamFailure } from "./_lib/convex-server";
export async function GET(request: NextRequest) {
  if (process.env.BYPASS_AUTH_FOR_TESTING === "true") {
    const team = [
      {
        id: "mem_sam_owner",
        user_id: "user_required_ux",
        business_id: "org_required_ux",
        role: "owner",
        email: "sam.reed@northstardemo.local",
        created_at: new Date("2026-01-15T00:00:00Z").toISOString(),
        updated_at: new Date("2026-01-15T00:00:00Z").toISOString(),
      },
      {
        id: "mem_alex_staff",
        user_id: "user_alex_staff",
        business_id: "org_required_ux",
        role: "cashier",
        email: "alex.rivera@northstardemo.local",
        created_at: new Date("2026-02-01T00:00:00Z").toISOString(),
        updated_at: new Date("2026-02-01T00:00:00Z").toISOString(),
      },
    ];
    return NextResponse.json({ success: true, data: team, nextCursor: null }, { headers: { "Cache-Control": "private, no-store" } });
  }
  try {
    const { client, ...context } = await teamClient(request);
    const cursor = request.nextUrl.searchParams.get("cursor");
    const result = await client.query(api.teamManagement.listTeamMembers, { ...context, paginationOpts: { cursor, numItems: 100 } });
    return NextResponse.json({ success: true, data: result.page.map(member => ({ ...member, created_at: new Date(member.created_at).toISOString(), updated_at: new Date(member.updated_at).toISOString() })), nextCursor: result.isDone ? null : result.continueCursor }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return teamFailure(error); }
}
