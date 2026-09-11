import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { getConvexAuthToken } from "@/lib/auth/convex-token";

const headers = { "Cache-Control": "private, no-store" };
export async function POST(request: NextRequest) {
  try {
    // Joining a business must work before the recipient has a selected membership.
    const authToken = await getConvexAuthToken();
    if (!authToken) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
    const body: unknown = await request.json().catch(() => null);
    if (!body || typeof body !== "object" || Array.isArray(body)) return NextResponse.json({ error: "Invalid invitation" }, { status: 400, headers });
    const { token, businessId } = body as Record<string, unknown>;
    if (typeof token !== "string" || !token || token.length > 256 || typeof businessId !== "string" || !/^[a-z0-9]{20,64}$/.test(businessId)) return NextResponse.json({ error: "Invalid invitation" }, { status: 400, headers });
    const url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!url) throw new Error("Service unavailable");
    const client = new ConvexHttpClient(url); client.setAuth(authToken);
    const result = await client.mutation(api.members.acceptInvitation, { token, businessId: businessId as Id<"businesses"> });
    return NextResponse.json(result, { status: result.status === "expired" ? 410 : 200, headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const entries: Array<[string, number, string]> = [["UNAUTHORIZED:", 401, "Unauthorized"], ["FORBIDDEN:", 403, "This invitation cannot be accepted by this account"], ["NOT_FOUND:", 404, "Invitation not found"], ["CONFLICT:", 409, "Membership already exists"]];
    const entry = entries.find(([code]) => message.includes(code));
    return NextResponse.json({ error: entry?.[2] ?? "Invitation service is temporarily unavailable" }, { status: entry?.[1] ?? 503, headers });
  }
}
