import { getCreditExposureReport } from "@/lib/credit/creditDecisionService";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const { businessId } = await resolveAuthContext();
    if (!businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const report = await getCreditExposureReport(businessId);

    return NextResponse.json(report, { status: 200 });
  } catch (error) {
    console.error("Error fetching exposure report:", error);

    return NextResponse.json(
      {
        error: "Failed to fetch report",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 }
    );
  }
}
