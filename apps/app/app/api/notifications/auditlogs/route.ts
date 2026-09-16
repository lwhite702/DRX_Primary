import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { notificationClient, notificationFailure, notificationHeaders } from "@/lib/notifications/convex-server";

export async function GET(request: NextRequest) {
  try {
    const { client, expectedUserId } = await notificationClient();
    const raw = request.nextUrl.searchParams.get("limit");
    const limit = raw === null ? 100 : Number(raw);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > 500) throw new Error("INVALID_ARGUMENT: Invalid limit");
    const logs = await client.query(api.notifications.auditLogs, { expectedUserId, limit });
    return NextResponse.json({ items: logs, data: logs, count: logs.length }, { headers: notificationHeaders });
  } catch (error) { return notificationFailure(error); }
}
