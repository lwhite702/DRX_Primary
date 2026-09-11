import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { intakeClient, intakeFailure, IntakeRequestError } from "@/lib/inventory/convex-intake";
export async function POST(request: NextRequest) {
  try {
    const { client, businessId } = await intakeClient(request);
    const body = await request.json();
    const key = request.headers.get("idempotency-key");
    if (!key || typeof body.inventory_id !== "string" || !["set", "delta"].includes(body.type) ||
        typeof body.value !== "number" || !Number.isFinite(body.value) || typeof body.reason !== "string") {
      throw new IntakeRequestError("Check the stock adjustment and request key");
    }
    const result = await client.mutation(api.inventory.adjustStock, { businessId, productId: body.inventory_id as Id<"products">,
      type: body.type, value: body.value, reason: body.reason, idempotencyKey: key });
    return NextResponse.json(result);
  } catch (error) { return intakeFailure(error); }
}
