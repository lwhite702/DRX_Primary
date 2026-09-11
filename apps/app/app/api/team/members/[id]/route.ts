import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { teamClient, teamFailure } from "../../_lib/convex-server";
type RouteContext = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, { params }: RouteContext) {
  try {
    const { client, ...context } = await teamClient(request);
    const { id } = await params;
    const member = await client.query(api.teamManagement.getTeamMember, { ...context, id });
    return NextResponse.json({ ...member, created_at: new Date(member.created_at).toISOString(), updated_at: new Date(member.updated_at).toISOString() }, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return teamFailure(error); }
}
export async function DELETE(request: NextRequest, { params }: RouteContext) {
  try {
    const { client, ...context } = await teamClient(request);
    const { id } = await params;
    await client.mutation(api.teamManagement.removeTeamMember, { ...context, id });
    return new NextResponse(null, { status: 204, headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return teamFailure(error); }
}
