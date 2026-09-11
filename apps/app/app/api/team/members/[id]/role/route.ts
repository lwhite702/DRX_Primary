import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { teamClient, teamFailure } from "../../../_lib/convex-server";
import { normalizeTeamRole } from "@/lib/team/roles";
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client, ...context } = await teamClient(request);
    const payload = await request.json().catch(() => null);
    const role = normalizeTeamRole(payload?.role);
    if (!role) throw new Error("INVALID_ARGUMENT: Invalid role");
    const { id } = await params;
    const result = await client.mutation(api.teamManagement.updateTeamRole, { ...context, id, role });
    return NextResponse.json(result, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return teamFailure(error); }
}
