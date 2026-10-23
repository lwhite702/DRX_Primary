import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { getPosBaselineReport } from "@/lib/reports/pos-baseline";
import { ensureServerFlag } from "@/lib/posthog/server-flags";
import { errorResponse } from "@/lib/api/response";
import { isValidDateKey } from "@/convex/helpers/businessTimezone";

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
    if ((fromParam && !isValidDateKey(fromParam)) || (toParam && !isValidDateKey(toParam))) {
      return NextResponse.json({ error: "Report dates must be valid YYYY-MM-DD calendar dates" }, { status: 400 });
    }
    if (fromParam && toParam && fromParam > toParam) {
      return NextResponse.json({ error: "Report start date must not be after its end date" }, { status: 400 });
    }
    const report = await getPosBaselineReport(businessId, {
      from: fromParam || undefined,
      to: toParam || undefined,
    });
    return NextResponse.json(report);
  } catch (error: unknown) {
    if (error instanceof Error && error.message.startsWith("INVALID_ARGUMENT:")) {
      return NextResponse.json({ error: error.message.replace("INVALID_ARGUMENT: ", "") }, { status: 400 });
    }
    console.error("POS baseline report error:", error);
    return errorResponse(
      "INTERNAL_ERROR",
      "Failed to generate POS baseline report",
      500,
    );
  }
}
