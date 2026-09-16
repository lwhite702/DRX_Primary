import { NextResponse } from "next/server";
import { auth, clerkClient } from "@/lib/adapters/auth/server";

export async function GET() {
  try {
    const { userId, sessionId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const client = await clerkClient();
    const result = await client.sessions.getSessionList({
      userId,
      status: "active",
      limit: 50,
    });

    const sessions = (result.data || []).map((session) => ({
      id: session.id,
      is_current: session.id === sessionId,
      last_active_at: new Date(session.lastActiveAt).toISOString(),
      device_type: session.latestActivity?.deviceType || "unknown",
      browser:
        [
          session.latestActivity?.browserName,
          session.latestActivity?.browserVersion,
        ]
          .filter(Boolean)
          .join(" ") || "Unknown",
      ip: session.latestActivity?.ipAddress || null,
      city: session.latestActivity?.city || null,
      country: session.latestActivity?.country || null,
      status: session.status,
    }));

    return NextResponse.json({ sessions });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("[security/sessions] Session fetch failed:", message);
    return NextResponse.json(
      { error: "Failed to fetch sessions" },
      { status: 500 },
    );
  }
}
