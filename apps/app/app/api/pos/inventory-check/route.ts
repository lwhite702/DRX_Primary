import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { businessClient } from "@/lib/business/convex-server";
import { z } from "zod";
export const dynamic = "force-dynamic";
const headers = { "Cache-Control": "private, no-store" };
const schema = z.object({ requestId: z.string().trim().min(1).max(160), inventoryId: z.string().regex(/^[a-z0-9]{20,64}$/), expectedWeightGrams: z.number().finite().nonnegative(), measuredWeightGrams: z.number().finite().nonnegative() });
function failure(error: unknown) {
  const message = error instanceof Error ? error.message : "";
  const errors: Array<[string, number, string]> = [["STALE_STOCK", 409, "Stock changed. Reload before checking again."], ["UNAUTHORIZED", 401, "Unauthorized"], ["FORBIDDEN", 403, "Inventory permission is required"], ["APPROVAL_REQUIRED", 403, "Supervisor approval is required"], ["NOT_FOUND", 404, "Product unavailable"], ["INVALID_ARGUMENT", 400, "Invalid inventory check"], ["CONFLICT", 409, "Stock or check changed. Reload before checking again."], ["INSUFFICIENT_STOCK", 409, "Inventory requires reconciliation"], ["INVALID_STATE", 503, "Inventory or approval settings require reconciliation"]];
  const [code, status, errorMessage] = errors.find(([code]) => message.includes(`${code}:`)) ?? ["UNAVAILABLE", 503, "Inventory check could not be confirmed. Retry the same request."];
  return NextResponse.json({ success: false, code, error: errorMessage }, { status, headers });
}
export async function GET(request: NextRequest) {
  try {
    const { client, ...context } = await businessClient(request);
    const result = await client.action(api.inventoryChecks.selectRandom, context);
    return NextResponse.json(result ?? { error: "No products available for check" }, { status: result ? 200 : 404, headers });
  } catch (error) { return failure(error); }
}
export async function POST(request: NextRequest) {
  try {
    const { client, ...context } = await businessClient(request);
    const payload = schema.safeParse(await request.json().catch(() => null));
    if (!payload.success) return NextResponse.json({ success: false, code: "INVALID_ARGUMENT", error: "Invalid inventory check" }, { status: 400, headers });
    const { inventoryId, ...values } = payload.data;
    return NextResponse.json(await client.mutation(api.inventoryChecks.record, { ...context, ...values, productId: inventoryId as Id<"products"> }), { status: 201, headers });
  } catch (error) { return failure(error); }
}
