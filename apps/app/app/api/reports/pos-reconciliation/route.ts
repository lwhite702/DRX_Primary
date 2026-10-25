import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { getPosReconciliationReport } from "@/lib/reports/pos-reconciliation";
import { ensureServerFlag } from "@/lib/posthog/server-flags";

export async function GET(request: NextRequest) {
  try {
    const { businessId, userId } = await resolveAuthContext(request);

    if (!businessId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const featureEnabled = await ensureServerFlag("feat_reports_pos_reconciliation", {
      distinctId: userId,
      personProperties: { business_id: businessId },
      defaultValue: true,
    });
    if (!featureEnabled) {
      return NextResponse.json(
        { error: "POS reconciliation report is temporarily disabled" },
        { status: 503 },
      );
    }

    const fromParam = request.nextUrl.searchParams.get("from");
    const toParam = request.nextUrl.searchParams.get("to");
    const toExclusive = request.nextUrl.searchParams.get("toExclusive") === "true";

    const from = fromParam ? new Date(fromParam) : undefined;
    const to = toParam ? new Date(toParam) : undefined;

    const report = await getPosReconciliationReport(businessId, {
      from: from && !Number.isNaN(from.getTime()) ? from : undefined,
      to: to && !Number.isNaN(to.getTime()) ? to : undefined,
      toExclusive,
    });

    const format = request.nextUrl.searchParams.get("format");
    if (format === "csv") {
      const header = "code,saleId,saleLineItemId,inventoryId,expected,actual,message";
      const rows = report.discrepancies.map((entry) =>
        [
          entry.code,
          entry.saleId,
          entry.saleLineItemId ?? "",
          entry.inventoryId ?? "",
          String(entry.expected).replaceAll(",", " "),
          String(entry.actual).replaceAll(",", " "),
          `"${entry.message.replaceAll("\"", "\"\"")}"`,
        ].join(","),
      );
      return new Response([header, ...rows].join("\n"), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
        },
      });
    }

    return NextResponse.json(report);
  } catch (error: unknown) {
    console.error(
      JSON.stringify({
        level: "error",
        route: "/api/reports/pos-reconciliation",
        message: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      }),
    );
    return NextResponse.json(
      {
        error: "Failed to generate POS reconciliation report",
      },
      { status: 500 },
    );
  }
}
