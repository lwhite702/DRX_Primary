import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import { notificationClient, notificationFailure, notificationHeaders } from "@/lib/notifications/convex-server";
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { client, expectedUserId } = await notificationClient();
    const { id } = await params;
    if (!id || id.length > 200) return NextResponse.json({ error: "Invalid notification" }, { status: 400, headers: notificationHeaders });
    await client.mutation(api.notifications.remove, { expectedUserId, notificationId: id });
    return NextResponse.json({}, { headers: notificationHeaders });
  } catch (error) {
    if (error instanceof Error && error.message.includes("NOT_FOUND:")) return NextResponse.json({ error: "Notification unavailable" }, { status: 404, headers: notificationHeaders });
    return notificationFailure(error);
  }
}
