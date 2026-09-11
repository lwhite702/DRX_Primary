import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";
import { getConvexAuthToken } from "@/lib/auth/convex-token";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";

const headers = { "Cache-Control": "private, no-store" };
type Context = { params: Promise<{ id: string }> };
export async function GET(request: NextRequest, { params }: Context) {
  try {
    const { userId, businessId: selectedBusinessId } = await resolveAuthContext(request);
    if (!userId || !selectedBusinessId) return NextResponse.json({ error: "Unauthorized" }, { status: 401, headers });
    const { id } = await params;
    const query = request.nextUrl.searchParams;
    const businessId = query.get("business_id") ?? selectedBusinessId;
    if (!id || id.length > 200 || !businessId || businessId.length > 200) throw new Error("INVALID_ARGUMENT:");
    if (query.has("expectedUserId") && query.get("expectedUserId") !== userId) throw new Error("FORBIDDEN:");
    const token = await getConvexAuthToken(), url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
    if (!token || !url) throw new Error("UNAVAILABLE:");
    const client = new ConvexHttpClient(url); client.setAuth(token);
    const result = await client.query(api.creditTransactions.get, { businessId, expectedUserId: userId, transactionId: id });
    return NextResponse.json(result, { headers });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    const match = [["FORBIDDEN:", 403, "Access denied"], ["NOT_FOUND:", 404, "Credit transaction unavailable"], ["INVALID_ARGUMENT:", 400, "Invalid credit transaction request"], ["INVALID_STATE:", 409, "Credit transaction requires reconciliation"]].find(([code]) => message.includes(String(code)));
    return NextResponse.json({ error: match?.[2] ?? "Credit service is temporarily unavailable" }, { status: Number(match?.[1] ?? 503), headers });
  }
}
function immutable() {
  return NextResponse.json({ error: "Recorded credit transactions cannot be edited or deleted." }, { status: 405, headers: { ...headers, Allow: "GET" } });
}
export async function PUT() { return immutable(); }
export async function DELETE() { return immutable(); }
