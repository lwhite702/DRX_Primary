import { NextRequest, NextResponse } from "next/server";

import { getCanonicalCommerceSummary } from "@/app/api/pos/_lib/convex-commerce";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import {
  canonicalSourceSummaryFromAggregate,
  combineCommerceDeliverySummaries,
  emptyCommerceDeliveryTotals,
  getLegacyWebCommerceSummary,
  type CombinedCommerceDeliverySummary,
  type CommerceDeliverySourceSummary,
} from "@/lib/reports/commerce-delivery";

function defaultPeriod() {
  const now = new Date();
  const startAt = Date.UTC(
    now.getUTCFullYear(),
    now.getUTCMonth(),
    now.getUTCDate(),
  );
  return { startAt, endAt: startAt + 24 * 60 * 60 * 1_000 };
}

function parsePeriod(request: NextRequest) {
  const fallback = defaultPeriod();
  const from = request.nextUrl.searchParams.get("from");
  const to = request.nextUrl.searchParams.get("to");
  const startAt = from ? new Date(from).getTime() : fallback.startAt;
  const endAt = to ? new Date(to).getTime() : fallback.endAt;
  if (
    !Number.isSafeInteger(startAt) ||
    !Number.isSafeInteger(endAt) ||
    endAt <= startAt
  ) {
    throw new Error("INVALID_PERIOD");
  }
  return { startAt, endAt };
}

const metricRows = [
  ["order_count", "Orders", "count", "orderCount"],
  ["gross_collected", "Gross collected", "cents", "grossCollectedCents"],
  ["net_cash_activity", "Net cash activity", "cents", "netCashActivityCents"],
  ["merchandise_revenue", "Merchandise revenue", "cents", "merchandiseRevenueCents"],
  ["delivery_revenue", "Delivery revenue", "cents", "deliveryRevenueCents"],
  ["vendor_delivery_expense", "Vendor delivery expense", "cents", "vendorDeliveryExpenseCents"],
  ["delivery_tax", "Delivery tax", "cents", "deliveryTaxCents"],
  ["unclassified_tax", "Legacy/unclassified tax", "cents", "unclassifiedTaxCents"],
  ["discounts", "Discounts", "cents", "discountCents"],
  ["cogs", "COGS", "cents", "cogsCents"],
  ["customer_fee_refunds", "Customer fee refunds", "cents", "customerFeeRefundCents"],
  ["delivery_tax_refunds", "Delivery tax refunds", "cents", "deliveryTaxRefundCents"],
  ["vendor_credits", "Vendor credits", "cents", "vendorCreditsCents"],
  ["net_revenue", "Net revenue", "cents", "netRevenueCents"],
  ["gross_profit", "Gross profit", "cents", "grossProfitCents"],
] as const;

function csvCell(value: unknown) {
  const text = String(value ?? "");
  return /[",\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text;
}

function toCsv(report: CombinedCommerceDeliverySummary) {
  const rows: unknown[][] = [
    ["section", "key", "label", "unit", "canonical", "legacy_web", "combined", "note"],
    ["metadata", "period_start", "Period start (inclusive)", "utc_iso", "", "", "", report.period.from],
    ["metadata", "period_end", "Period end (exclusive)", "utc_iso", "", "", "", report.period.to],
    ["metadata", "profit_coverage", "Gross profit coverage", "status", "", "", "", report.grossProfitComplete ? "complete" : "known_costs_only"],
    ["metadata", "source_availability", "Ledger availability", "status", report.canonical.available === false ? "unavailable" : "available", report.legacyWeb.available === false ? "unavailable" : "available", "", "Unavailable source columns are blank, not zero"],
    ["metadata", "duplicates_excluded", "Mirrored orders excluded", "count", "", "", report.duplicateOrdersExcluded, "Matched by stable checkout idempotency reference"],
  ];
  if (report.canonical.cogsAllocationCoverage) {
    const coverage = report.canonical.cogsAllocationCoverage;
    rows.push(
      ["coverage", "inventory_lines", "Canonical inventory lines", "count", coverage.inventoryLineCount, "", "", "Manual lines are excluded"],
      ["coverage", "fully_allocated_lines", "Fully allocated inventory lines", "count", coverage.fullyAllocatedLineCount, "", "", ""],
      ["coverage", "partially_allocated_lines", "Partially allocated inventory lines", "count", coverage.partiallyAllocatedLineCount, "", "", ""],
      ["coverage", "unallocated_lines", "Unallocated inventory lines", "count", coverage.unallocatedLineCount, "", "", ""],
      ["coverage", "expected_quantity", "Expected inventory quantity", "quantity", coverage.expectedQuantity, "", "", ""],
      ["coverage", "allocated_quantity", "Allocated inventory quantity", "quantity", coverage.allocatedQuantity, "", "", ""],
      ["coverage", "unallocated_quantity", "Unallocated inventory quantity", "quantity", coverage.unallocatedQuantity, "", "", ""],
      ["coverage", "coverage_bps", "COGS allocation coverage", "basis_points", coverage.coverageBps, "", "", ""],
    );
  }
  if (report.canonical.manualCostCoverage) {
    const coverage = report.canonical.manualCostCoverage;
    rows.push(
      ["coverage", "manual_lines", "Canonical manual lines", "count", coverage.manualLineCount, "", "", ""],
      ["coverage", "known_cost_manual_lines", "Manual lines with known cost", "count", coverage.knownCostLineCount, "", "", ""],
      ["coverage", "unknown_cost_manual_lines", "Manual lines with unknown cost", "count", coverage.unknownCostLineCount, "", "", ""],
      ["coverage", "known_manual_cogs", "Known manual-line COGS", "cents", coverage.knownManualCogsCents, "", "", ""],
      ["coverage", "manual_cost_complete", "Manual cost coverage complete", "boolean", coverage.complete, "", "", ""],
    );
  }
  for (const [key, label, unit, field] of metricRows) {
    rows.push([
      "metric",
      key,
      label,
      unit,
      report.canonical.available === false ? "" : report.canonical.totals[field],
      report.legacyWeb.available === false ? "" : report.legacyWeb.totals[field],
      report.combined[field],
      key === "gross_profit" && !report.grossProfitComplete
        ? "Known gross profit only; see warnings"
        : "",
    ]);
  }
  report.warnings.forEach((warning, index) => {
    rows.push(["warning", `warning_${index + 1}`, "Coverage warning", "text", "", "", "", warning]);
  });
  return rows.map((row) => row.map(csvCell).join(",")).join("\n");
}

function unavailableSource(source: CommerceDeliverySourceSummary["source"]): CommerceDeliverySourceSummary {
  return {
    source,
    available: false,
    totals: emptyCommerceDeliveryTotals(),
    orderNumbers: [],
    unallocatedCogsOrderCount: 0,
    untrackedVendorExpenseOrderCount: 0,
    cogsAllocationCoverage: null,
    manualCostCoverage: null,
    grossProfitComplete: false,
  };
}

export async function GET(request: NextRequest) {
  try {
    const { businessId, userId } = await resolveAuthContext();
    if (!businessId || !userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const { startAt, endAt } = parsePeriod(request);

    let canonicalSummary = unavailableSource("canonical");
    let legacySummary = unavailableSource("legacy_web");
    let duplicateOrdersExcluded = 0;

    try {
      const canonicalAggregate = await getCanonicalCommerceSummary({
        businessId,
        startAt,
        endAt,
      });
      canonicalSummary = canonicalSourceSummaryFromAggregate(canonicalAggregate);
    } catch {
      // Do not log provider errors: they can contain tenant or connection data.
      console.warn("Commerce report: canonical ledger unavailable");
    }

    // Ordinary web checkout still writes here. Read it even when Convex is
    // healthy, excluding mirrored orders by their stable checkout references.
    try {
      const local = await getLegacyWebCommerceSummary(
        businessId,
        { from: new Date(startAt), to: new Date(endAt) },
        canonicalSummary.orderNumbers,
      );
      legacySummary = local.summary;
      duplicateOrdersExcluded = local.duplicateOrdersExcluded;
    } catch {
      console.warn("Commerce report: legacy web ledger unavailable");
    }

    if (canonicalSummary.available === false && legacySummary.available === false) {
      return NextResponse.json(
        { error: "Commerce reporting is temporarily unavailable. No sales ledger could be read. Please retry." },
        { status: 503 },
      );
    }

    const report = combineCommerceDeliverySummaries({
      period: {
        from: new Date(startAt).toISOString(),
        to: new Date(endAt).toISOString(),
      },
      canonical: canonicalSummary,
      legacyWeb: legacySummary,
      duplicateOrdersExcluded,
    });

    if (request.nextUrl.searchParams.get("format") === "csv") {
      return new Response(toCsv(report), {
        headers: {
          "Content-Type": "text/csv; charset=utf-8",
          "Content-Disposition": `attachment; filename="drx-commerce-delivery-${new Date(startAt).toISOString().slice(0, 10)}.csv"`,
        },
      });
    }
    return NextResponse.json(report);
  } catch (error) {
    if (error instanceof Error && error.message === "INVALID_PERIOD") {
      return NextResponse.json({ error: "Invalid reporting period" }, { status: 400 });
    }
    console.error("Commerce reporting failed");
    return NextResponse.json(
      {
        error: "Failed to generate commerce and delivery report",
      },
      { status: 500 },
    );
  }
}
