import { type NextRequest, NextResponse } from "next/server";
import { emit } from "@/lib/queue";
import { errorResponse } from "@/lib/api/response";

export async function POST(req: NextRequest) {
  try {
    const {
      business_id,
      analysis_type = "all",
      margin_requirement = 0.3,
      supplier_lead_time_days = 7,
    } = await req.json();

    if (!business_id) {
      return NextResponse.json({ error: "business_id is required" }, { status: 400 });
    }

    // Trigger background Inngest job asynchronously
    const inngestRes = await emit("ai/pricing-inventory.analyze", {
      business_id,
      analysis_type,
      margin_requirement,
      supplier_lead_time_days,
    });

    return NextResponse.json(
      {
        jobId: inngestRes.ids[0],
        status: "queued",
      },
      { status: 202 }
    );
  } catch (error: any) {
    console.error("Failed to queue AI pricing inventory analysis:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Internal Server Error",
      500,
      error instanceof Error ? error.message : "Unknown error"
    );
  }
}
