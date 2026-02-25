import { NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { getPosBaselineReport } from "@/lib/reports/pos-baseline";

export async function GET() {
  const { businessId } = await resolveAuthContext();

  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const report = await getPosBaselineReport(businessId);
  return NextResponse.json(report);
}

