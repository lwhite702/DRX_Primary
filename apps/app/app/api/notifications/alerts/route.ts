import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { notificationClient, notificationFailure, notificationHeaders } from "@/lib/notifications/convex-server";
const schema = z.object({ requestId: z.string().min(1).max(200), userId: z.string().min(1).max(200).optional(), type: z.string().min(1).max(50), message: z.string().min(1), metadata: z.record(z.string(), z.unknown()).optional() });
export async function POST(request: NextRequest) {
  try {
    const { client, expectedUserId } = await notificationClient();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid alert payload" }, { status: 400, headers: notificationHeaders });
    const { userId, metadata, ...values } = parsed.data;
    const result = await client.action(api.notificationActions.createAlert, { ...values, expectedUserId, targetUserId: userId ?? expectedUserId, metadataJson: metadata === undefined ? undefined : JSON.stringify(metadata) });
    return NextResponse.json(result, { status: 201, headers: notificationHeaders });
  } catch (error) { return notificationFailure(error); }
}
