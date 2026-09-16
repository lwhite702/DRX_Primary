import { NextRequest, NextResponse } from "next/server";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { z } from "zod";
import { intakeClient, intakeFailure, IntakeRequestError } from "@/lib/inventory/convex-intake";

const adjustPayloadSchema = z.object({
  inventory_id: z.string().min(1).max(128),
  type: z.enum(["set", "delta"]),
  value: z.number().finite(),
  reason: z.string().min(1).max(500),
});

export async function POST(request: NextRequest) {
  try {
    const { client, businessId } = await intakeClient(request);
    const rawBody = await request.json().catch(() => null);
    const key = request.headers.get("idempotency-key");
    const parsed = adjustPayloadSchema.safeParse(rawBody);
    if (!key || !parsed.success) {
      throw new IntakeRequestError("Check the stock adjustment and request key");
    }
    const body = parsed.data;
    const result = await client.mutation(api.inventory.adjustStock, {
      businessId,
      productId: body.inventory_id as Id<"products">,
      type: body.type,
      value: body.value,
      reason: body.reason,
      idempotencyKey: key,
    });
    return NextResponse.json(result);
  } catch (error) { return intakeFailure(error); }
}
