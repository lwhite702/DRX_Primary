import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { posWeightEngine } from "@/lib/utils/pos-weight-engine";
import { z } from "zod";
import { errorResponse } from "@/lib/api/response";

const DrawerEventSchema = z.object({
  eventType: z.enum(["no_sale", "cash_drop", "payout", "audit", "refund"]).default("no_sale"),
  note: z.string().max(500).default("Drawer opened via API"),
});

export async function POST(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext(request);
    if (!userId || !businessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const body = await request.json();
    const payload = DrawerEventSchema.safeParse(body);
    if (!payload.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid drawer event payload",
        400,
        payload.error.flatten(),
      );
    }

    const result = await posWeightEngine.recordDrawerEvent(
      businessId,
      payload.data.eventType,
      payload.data.note
    );

    if (!result.success) {
      return errorResponse(
        "BAD_REQUEST",
        result.error || "Failed to record drawer event",
        400,
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Drawer event error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Internal Server Error",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
