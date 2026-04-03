import { NextRequest, NextResponse } from "next/server";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { getPosReconciliationReport } from "@/lib/reports/pos-reconciliation";

export async function GET(request: NextRequest) {
  const { businessId } = await resolveAuthContext();

  if (!businessId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const fromParam = request.nextUrl.searchParams.get("from");
  const toParam = request.nextUrl.searchParams.get("to");

  const from = fromParam ? new Date(fromParam) : undefined;
  const to = toParam ? new Date(toParam) : undefined;

  const report = await getPosReconciliationReport(businessId, {
    from: from && !Number.isNaN(from.getTime()) ? from : undefined,
    to: to && !Number.isNaN(to.getTime()) ? to : undefined,
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
}
