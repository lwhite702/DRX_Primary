import { NextRequest, NextResponse } from "next/server";
import { auth, clerkClient } from "@/lib/adapters/auth/server";
import { db } from "@/lib/db";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sessionId: string }> | { sessionId: string } },
) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { sessionId } = await Promise.resolve(params);

    const client = await clerkClient();
    const session = await client.sessions.getSession(sessionId);

    if (!session || session.userId !== userId) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await client.sessions.revokeSession(sessionId);

    await db.authSessionEvent.create({
      data: {
        userId,
        sessionId,
        eventType: "session.revoked.manual",
        metadata: {
          source: "settings_device_list",
        },
      },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("[security/sessions/revoke]", error);
    return NextResponse.json(
      { error: "Failed to revoke session" },
      { status: 500 },
    );
  }
}
