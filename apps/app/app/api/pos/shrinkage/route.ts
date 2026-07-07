import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { posWeightEngine } from "@/lib/utils/pos-weight-engine";

export async function POST(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext();
    if (!userId || !businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { inventoryId, quantityGrams, shrinkageType = "personal_use", note } = body;

    if (!inventoryId || !quantityGrams) {
      return NextResponse.json(
        { error: "inventoryId and quantityGrams are required" },
        { status: 400 }
      );
    }

    const result = await posWeightEngine.recordShrinkage(
      businessId,
      inventoryId,
      Number(quantityGrams),
      shrinkageType,
      note
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to record shrinkage" },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Shrinkage event error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
