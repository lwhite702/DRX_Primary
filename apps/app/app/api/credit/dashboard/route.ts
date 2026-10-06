import { NextRequest, NextResponse } from "next/server";
import { ConvexHttpClient } from "convex/browser";
import { z } from "zod";
import { api } from "@/convex/_generated/api";
import { getCurrentUser } from "@/lib/adapters/auth";
import { getConvexAuthToken } from "@/lib/auth/convex-token";

const headers = { "Cache-Control": "private, no-store" };
const scopeInput = z.object({ business_id: z.string().trim().min(1).max(200), customer_id: z.string().trim().min(1).max(200).optional(), expectedUserId: z.string().min(1).max(200).optional() });
async function connection() {
  const user = await getCurrentUser();
  if (!user) throw new Error("UNAUTHORIZED:");
  const token = await getConvexAuthToken(), url = process.env.NEXT_PUBLIC_CONVEX_URL?.trim();
  if (!token || !url) throw new Error("UNAVAILABLE:");
  const client = new ConvexHttpClient(url); client.setAuth(token);
  return { client, expectedUserId: user.id };
}
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const match = [
    ["UNAUTHORIZED:", 401, "Unauthorized"], ["FORBIDDEN:", 403, "Access denied"],
    ["NOT_FOUND:", 404, "Credit account unavailable"], ["INVALID_ARGUMENT:", 400, "Invalid credit dashboard request"],
    ["INVALID_STATE:", 409, "Credit account requires reconciliation"],
    ["CAPACITY_EXCEEDED:", 503, "Credit data exceeds the current processing limit"],
  ].find(([code]) => message.includes(String(code)));
  return NextResponse.json({ error: match?.[2] ?? "Credit dashboard is temporarily unavailable" }, { status: Number(match?.[1] ?? 503), headers });
}
export async function GET(request: NextRequest) {
  if (process.env.BYPASS_AUTH_FOR_TESTING === "true") {
    const params = new URL(request.url).searchParams;
    const customerId = params.get("customer_id");
    if (!customerId) {
      return NextResponse.json({
        page: [
          {
            customerId: "867f4b37-9788-4dff-be11-38b03ad166aa",
            displayName: "Sam Reed",
            isActive: true,
            creditEnabled: true,
            limitCents: 50000,
            unlimited: false,
            balanceCents: 14500,
            allocationStatus: "ready",
          },
        ],
        isDone: true,
        continueCursor: "",
      }, { headers });
    }
    return NextResponse.json({
      status: "ready",
      balanceCents: 14500,
      page: [
        {
          entryId: "entry_aging_001",
          remainingCents: 14500,
          bucket: "current",
        },
      ],
      isDone: true,
      continueCursor: "",
    }, { headers });
  }
  try {
    const { client, expectedUserId } = await connection();
    const params = new URL(request.url).searchParams;
    const parsed = scopeInput.safeParse(Object.fromEntries(params));
    const limit = Number(params.get("limit") ?? 50), cursor = params.get("cursor");
    if (!parsed.success || !Number.isInteger(limit) || limit < 1 || limit > 100 || (cursor !== null && (!cursor || cursor.length > 10000))) throw new Error("INVALID_ARGUMENT:");
    if (parsed.data.expectedUserId !== undefined && parsed.data.expectedUserId !== expectedUserId) throw new Error("FORBIDDEN:");
    if (!parsed.data.customer_id) {
      const result = await client.query(api.creditDashboard.accountsPage, { businessId: parsed.data.business_id, expectedUserId, paginationOpts: { cursor, numItems: limit } });
      return NextResponse.json(result, { headers });
    }
    const asOfDate = Number(params.get("as_of_date"));
    if (!params.has("as_of_date") || !Number.isSafeInteger(asOfDate) || asOfDate < 0 || asOfDate % 86400000 !== 0) throw new Error("INVALID_ARGUMENT:");
    const scope = await client.query(api.creditDashboard.resolveScope, { businessId: parsed.data.business_id, customerId: parsed.data.customer_id, expectedUserId });
    if (!scope.customerId) throw new Error("NOT_FOUND:");
    const result = await client.query(api.creditAllocation.agingPage, { ...scope, customerId: scope.customerId, expectedUserId, asOfDate, paginationOpts: { cursor, numItems: limit } });
    return NextResponse.json(result, { headers });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    const { client, expectedUserId } = await connection();
    const parsed = scopeInput.extend({ customer_id: z.string().trim().min(1).max(200) }).strict().safeParse(await request.json().catch(() => null));
    if (!parsed.success) throw new Error("INVALID_ARGUMENT:");
    if (parsed.data.expectedUserId !== undefined && parsed.data.expectedUserId !== expectedUserId) throw new Error("FORBIDDEN:");
    const scope = await client.query(api.creditDashboard.resolveScope, { businessId: parsed.data.business_id, customerId: parsed.data.customer_id, expectedUserId });
    if (!scope.customerId) throw new Error("NOT_FOUND:");
    await client.mutation(api.creditAllocation.refresh, { ...scope, customerId: scope.customerId, expectedUserId });
    return NextResponse.json({ success: true, status: "pending" }, { headers });
  } catch (error) { return failure(error); }
}
