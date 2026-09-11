import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { notificationClient, notificationFailure, notificationHeaders } from "@/lib/notifications/convex-server";
export async function GET(_request: NextRequest, { params }: { params: Promise<{ userId: string }> | { userId: string } }) {
  try {
    const { client, expectedUserId } = await notificationClient();
    const { userId } = await params;
    const result = await client.query(api.notificationPreferences.get, { expectedUserId, targetUserId: userId });
    if (!result) return NextResponse.json({ error: "Not found" }, { status: 404, headers: notificationHeaders });
    return NextResponse.json({ userId: result.userId, preferences: JSON.parse(result.preferencesJson), revision: result.revision }, { headers: notificationHeaders });
  } catch (error) { return notificationFailure(error); }
}
