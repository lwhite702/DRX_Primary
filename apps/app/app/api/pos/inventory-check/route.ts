import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { posWeightEngine } from "@/lib/utils/pos-weight-engine";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext();
    if (!userId || !businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const result = await posWeightEngine.getRandomCheckProduct(businessId);
    
    if (result.error) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error("Inventory check random product error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const { userId, businessId } = await resolveAuthContext();
    if (!userId || !businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();
    const { inventoryId, measuredWeightGrams } = body;

    const parsedWeight = Number(measuredWeightGrams);
    if (!inventoryId || measuredWeightGrams === undefined || isNaN(parsedWeight) || parsedWeight < 0) {
      return NextResponse.json(
        { error: "inventoryId and a valid non-negative measuredWeightGrams are required" },
        { status: 400 }
      );
    }

    const result = await posWeightEngine.recordInventoryCheck(
      businessId,
      inventoryId,
      Number(measuredWeightGrams)
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to record inventory check" },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Inventory check submit error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
