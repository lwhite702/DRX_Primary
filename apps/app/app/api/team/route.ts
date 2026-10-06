import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { teamClient, teamFailure } from "./_lib/convex-server";
export async function GET(request: NextRequest) {
  try {
    const { client, ...context } = await teamClient(request);
    const cursor = request.nextUrl.searchParams.get("cursor");
    const result = await client.query(api.teamManagement.listTeamMembers, { ...context, paginationOpts: { cursor, numItems: 100 } });
    return NextResponse.json({ success: true, data: result.page.map(member => ({ ...member, created_at: new Date(member.created_at).toISOString(), updated_at: new Date(member.updated_at).toISOString() })), nextCursor: result.isDone ? null : result.continueCursor }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return teamFailure(error); }
}
