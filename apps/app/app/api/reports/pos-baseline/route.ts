import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { getPosBaselineReport } from "@/lib/reports/pos-baseline";
import { ensureServerFlag } from "@/lib/posthog/server-flags";
import { errorResponse } from "@/lib/api/response";

export async function GET(request: NextRequest) {
  try {
    const { businessId, userId } = await resolveAuthContext(request);

    if (!businessId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const featureEnabled = await ensureServerFlag("feat_reports_pos_baseline", {
      distinctId: userId,
      personProperties: { business_id: businessId },
      defaultValue: true,
    });
    if (!featureEnabled) {
      return NextResponse.json(
        { error: "POS baseline report is temporarily disabled" },
        { status: 503 },
      );
    }

    const fromParam = request.nextUrl.searchParams.get("from");
    const toParam = request.nextUrl.searchParams.get("to");
    const timezoneParam = request.nextUrl.searchParams.get("timezone") || undefined;
    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;

    const report = await getPosBaselineReport(businessId, {
      from: from && !Number.isNaN(from.getTime()) ? from : undefined,
      to: to && !Number.isNaN(to.getTime()) ? to : undefined,
      timezone: timezoneParam,
    });
    return NextResponse.json(report);
  } catch (error: unknown) {
    console.error("POS baseline report error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to generate POS baseline report",
      500,
    );
  }
}
