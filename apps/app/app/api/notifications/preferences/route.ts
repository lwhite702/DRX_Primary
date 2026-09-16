import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { notificationClient, notificationFailure, notificationHeaders } from "@/lib/notifications/convex-server";
const schema = z.object({ preferences: z.record(z.string(), z.unknown()), expectedRevision: z.number().int().nonnegative().optional() });
export async function POST(request: NextRequest) {
  try {
    const { client, expectedUserId } = await notificationClient();
    const parsed = schema.safeParse(await request.json().catch(() => null));
    if (!parsed.success) return NextResponse.json({ error: "Invalid preferences payload" }, { status: 400, headers: notificationHeaders });
    const result = await client.action(api.notificationPreferenceActions.save, { expectedUserId, preferencesJson: JSON.stringify(parsed.data.preferences), expectedRevision: parsed.data.expectedRevision });
    return NextResponse.json({ userId: result.userId, preferences: JSON.parse(result.preferencesJson), revision: result.revision }, { status: 201, headers: notificationHeaders });
  } catch (error) { return notificationFailure(error); }
}
