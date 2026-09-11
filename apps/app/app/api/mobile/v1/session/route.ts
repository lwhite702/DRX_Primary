import { NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { auth } from "@/lib/adapters/auth/server";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
const headers = { "Cache-Control": "private, no-store" };
export async function GET() {
  try {
    const { userId, orgId } = await auth();
    if (!userId) return NextResponse.json({ error: "Authentication required" }, { status: 401, headers });
    const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim(), token = await getConvexAuthToken();
    if (!url || !token) throw new Error("UNAVAILABLE:");
    const client = new ConvexHttpClient(url); client.setAuth(token);
    const session = await client.query(api.session.mobileBootstrap, { expectedUserId: userId, expectedOrganizationId: orgId ?? null });
    return NextResponse.json(session, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const status = message.includes("UNAUTHENTICATED:") ? 401 : ["FORBIDDEN:", "UNAUTHORIZED:", "NOT_FOUND:"].some(code => message.includes(code)) ? 403 : 503;
    return NextResponse.json({ error: status === 401 ? "Authentication required" : status === 403 ? "No active DRX business is available for this operator." : "Unable to restore the operator session" }, { status, headers });
  }
}
