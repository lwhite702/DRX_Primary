import { getCreditExposureReport } from "@/lib/credit/creditDecisionService";
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const business_id = searchParams.get("business_id");

    if (!business_id) {
      return NextResponse.json(
        { error: "Missing business_id parameter" },
        { status: 400 }
      );
    }

    const report = await getCreditExposureReport(business_id);

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
