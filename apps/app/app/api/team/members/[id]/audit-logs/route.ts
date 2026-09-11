import { NextRequest, NextResponse } from "next/server";
import type { FunctionReturnType } from "convex/server";
import { api } from "@/convex/_generated/api";
import { teamClient, teamFailure } from "../../../_lib/convex-server";

export async function GET(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client, ...context } = await teamClient(request);
    const { id } = await params;
    // Preserve the existing array response while reading bounded, indexed Convex pages.
    const logs: Array<{ id: string; userId: string; businessId: string; action: string; entityType: string; entityId: string; metadata: string; createdAt: string }> = [];
    let cursor: string | null = null;
    for (;;) {
      const result: FunctionReturnType<typeof api.teamManagement.listTeamMemberAudit> = await client.query(api.teamManagement.listTeamMemberAudit, { ...context, id, paginationOpts: { cursor, numItems: 100 } });
      logs.push(...result.page.map(event => ({ ...event, createdAt: new Date(event.createdAt).toISOString() })));
      if (result.isDone) break;
      if (result.continueCursor === cursor) throw new Error("Audit pagination did not advance");
      cursor = result.continueCursor;
    }
    return NextResponse.json(logs, { headers: { "Cache-Control": "private, no-store" } });
  } catch (error) { return teamFailure(error); }
}
