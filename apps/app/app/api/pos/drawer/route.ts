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
    const { eventType = "no_sale", note = "Drawer opened via API" } = body;

    const result = await posWeightEngine.recordDrawerEvent(
      businessId,
      eventType,
      note
    );

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to record drawer event" },
        { status: 400 }
      );
    }

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    console.error("Drawer event error:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
