import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { notificationClient, notificationFailure, notificationHeaders } from "@/lib/notifications/convex-server";
export async function GET(_request: NextRequest) {
  try {
    const { client, expectedUserId } = await notificationClient();
    const notifications = await client.query(api.notifications.unread, { expectedUserId });
    return NextResponse.json({ notifications, data: notifications, count: notifications.length }, { headers: notificationHeaders });
  } catch (error) { return notificationFailure(error); }
}
const schema = z.object({ id: z.string().min(1).max(200).optional(), mark_all_read: z.boolean().optional() }).refine(value => value.mark_all_read === true || Boolean(value.id));
export async function PUT(request: NextRequest) {
  try {
    const { client, expectedUserId } = await notificationClient();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Missing id or mark_all_read" }, { status: 400, headers: notificationHeaders });
    if (parsed.data.mark_all_read) await client.action(api.notifications.markAllRead, { expectedUserId });
    else await client.mutation(api.notifications.markRead, { expectedUserId, notificationId: parsed.data.id! });
    return NextResponse.json({ success: true }, { headers: notificationHeaders });
  } catch (error) {
    if (error instanceof Error && error.message.includes("NOT_FOUND:")) return NextResponse.json({ error: "Notification unavailable" }, { status: 404, headers: notificationHeaders });
    return notificationFailure(error);
  }
}
