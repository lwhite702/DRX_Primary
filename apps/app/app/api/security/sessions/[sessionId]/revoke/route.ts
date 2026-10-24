import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { auth, clerkClient } from "@/lib/adapters/auth/server";

export async function POST(_request: NextRequest, { params }: { params: Promise<{ sessionId: string }> | { sessionId: string } }) {
  const headers = { "Cache-Control": "private, no-store" };
  const { sessionId } = await params;
  try {
    const token = await getConvexAuthToken();
    if (!token) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
    const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!url) throw new Error("UNAVAILABLE:");
    const client = new ConvexHttpClient(url); client.setAuth(token);
    return NextResponse.json(await client.action(api.securitySessions.revoke, { sessionId, secretKey: process.env.CLERK_SECRET_KEY }), { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("UNAVAILABLE:")) {
      try {
        const { userId } = await auth();
        if (userId) {
          const client = await clerkClient();
          const session = await client.sessions.getSession(sessionId);
          if (session && session.userId === userId) {
            await client.sessions.revokeSession(sessionId);
            return NextResponse.json({ success: true }, { headers });
          } else if (session && session.userId !== userId) {
            return NextResponse.json({ error: "Forbidden" }, { status: 403, headers });
          }
        }
      } catch (fallbackError) {
        console.error("[security/sessions/revoke] Fallback revocation failed:", fallbackError);
      }
    }
    const status = message.includes("UNAUTHORIZED:") ? 401 : message.includes("FORBIDDEN:") ? 403 : message.includes("INVALID_ARGUMENT:") ? 400 : 503;
    return NextResponse.json({ error: status === 403 ? "Forbidden" : status === 401 ? "Unauthorized" : status === 400 ? "Invalid session" : "Session revocation could not be confirmed. Refresh before retrying." }, { status, headers });
  }
}
