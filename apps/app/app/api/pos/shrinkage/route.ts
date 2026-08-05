import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { posWeightEngine } from "@/lib/utils/pos-weight-engine";
import { z } from "zod";
import { errorResponse } from "@/lib/api/response";

const ShrinkageSchema = z.object({
  inventoryId: z.string().uuid(),
  quantityGrams: z.number().positive(),
  shrinkageType: z.enum(["personal_use", "damaged", "theft", "expired", "lost"]).default("personal_use"),
  note: z.string().max(500).optional(),
});

export async function POST(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext(request);
    if (!userId || !businessId) {
      return errorResponse("UNAUTHORIZED", "Unauthorized", 401);
    }

    const body = await request.json();
    const payload = ShrinkageSchema.safeParse(body);
    if (!payload.success) {
      return errorResponse(
        "VALIDATION_ERROR",
        "Invalid shrinkage event payload",
        400,
        payload.error.flatten(),
      );
    }

    const result = await posWeightEngine.recordShrinkage(
      businessId,
      payload.data.inventoryId,
      payload.data.quantityGrams,
      payload.data.shrinkageType,
      payload.data.note
    );

    if (!result.success) {
      return errorResponse(
        "BAD_REQUEST",
        result.error || "Failed to record shrinkage",
        400,
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Shrinkage event error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Internal Server Error",
      500,
      error instanceof Error ? error.message : "Unknown error",
    );
  }
}
