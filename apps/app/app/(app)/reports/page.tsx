import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { getPosBaselineReport } from "@/lib/reports/pos-baseline";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ReportsTour } from "./_components/ReportsTour";
import { CommerceDeliverySummary } from "./_components/commerce-delivery-summary";
import { DayNavigator } from "./_components/day-navigator";
import { isValidDateKey } from "@/convex/helpers/businessTimezone";

export const dynamic = "force-dynamic";

const MAX_LOW_STOCK_ITEMS_DISPLAY = 8;

export default async function ReportsPage({
  searchParams,
}: {
  searchParams?: Promise<{
    from?: string;
    to?: string;
  }>;
}) {
  const { businessId } = await resolveAuthContext();
  const resolvedSearchParams = await searchParams;

  if (!businessId) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-2">Sign in to view reporting.</p>
        </div>
      </div>
    );
  }

  const from = resolvedSearchParams?.from;
  const to = resolvedSearchParams?.to;
  if ((from && !isValidDateKey(from)) || (to && !isValidDateKey(to))) {
    return (
      <div className="p-4 md:p-8 space-y-6">
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground" role="alert">Choose valid calendar dates for this report.</p>
      </div>
    );
  }
  const range = {
    from: from || undefined,
    to: to || undefined,
  };

  let report: Awaited<ReturnType<typeof getPosBaselineReport>>;
  try {
    report = await getPosBaselineReport(businessId, range);
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("INVALID_ARGUMENT:")) {
      return (
        <div className="p-4 md:p-8 space-y-6">
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground" role="alert">Choose a report end date that is on or after its start date.</p>
        </div>
      );
    }
    throw error;
  }

  const timeZone = report.period.timezone || "America/New_York";
  const currentDateStr = (() => {
    if (resolvedSearchParams?.from && /^\d{4}-\d{2}-\d{2}$/.test(resolvedSearchParams.from)) {
      return resolvedSearchParams.from;
    }
    try {
      const dtf = new Intl.DateTimeFormat("en-CA", {
        timeZone,
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      });
      return dtf.format(new Date(report.period.from));
    } catch {
      return new Date(report.period.from).toISOString().split("T")[0];
    }
  })();

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground mt-2">
            Baseline sales, cost, and margin visibility from the stabilized POS ledger.
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Window (end exclusive): {formatDateTime(report.period.from)} to {formatDateTime(report.period.to)} ({timeZone})
          </p>
          <Link
            href={`/api/reports/pos-reconciliation?from=${encodeURIComponent(report.period.from)}&to=${encodeURIComponent(report.period.to)}&toExclusive=true&format=csv`}
            className="text-xs text-primary underline underline-offset-4"
          >
            Export reconciliation CSV
          </Link>
        </div>
      </div>

      <DayNavigator currentDateStr={currentDateStr} timeZone={timeZone} />

      <CommerceDeliverySummary
        from={report.period.from}
        toExclusive={report.period.to}
      />

      <div id="tour-reports-stats" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{report.period.mode === "custom" ? "Sales in Selected Window" : "Sales Today"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">{formatCurrency(report.today.salesTotal)}</div>
            <p className="text-sm text-muted-foreground">{report.today.salesCount} completed sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{report.period.mode === "custom" ? "COGS in Selected Window" : "Today COGS"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">{report.today.costOfGoodsSold === null ? "Unavailable" : formatCurrency(report.today.costOfGoodsSold)}</div>
            <p className="text-sm text-muted-foreground">{report.today.costOfGoodsSold === null ? "Cost allocation is incomplete" : "Complete allocated cost"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">{report.period.mode === "custom" ? "Cash Sales in Selected Window" : "Cash Sales Today"}</CardTitle></CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">{formatCurrency(report.today.cashSales)}</div>
            <p className="text-sm text-muted-foreground">Cash tenders recorded on completed sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">{report.period.mode === "custom" ? "Tax in Selected Window" : "Tax Today"}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(report.today.totalTax)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">{report.period.mode === "custom" ? "Subtotal in Selected Window" : "Subtotal Today"}</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{formatCurrency(report.today.subtotal)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Average Sale</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-bold">{report.today.salesCount === 0 ? "—" : formatCurrency(report.today.averageOrderValue)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader><CardTitle className="text-sm font-medium">Payment Methods</CardTitle></CardHeader>
          <CardContent className="space-y-2">
            {Object.entries(report.paymentMethodTotals).length === 0 ? <p className="text-sm text-muted-foreground">No completed sale tenders in this window.</p> : Object.entries(report.paymentMethodTotals).map(([method, amount]) => (
              <div key={method} className="flex items-center justify-between text-sm"><span className="capitalize">{method.replaceAll("_", " ")}</span><span className="font-medium">{formatCurrency(amount)}</span></div>
            ))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">{report.period.mode === "custom" ? "Gross Profit in Selected Window" : "Week Gross Profit"}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">{report.week.grossProfit === null ? "Unavailable" : formatCurrency(report.week.grossProfit)}</div>
            <p className="text-sm text-muted-foreground">
              Revenue {formatCurrency(report.week.salesTotal)} against COGS{" "}
              {report.week.costOfGoodsSold === null ? "unavailable until costs reconcile" : formatCurrency(report.week.costOfGoodsSold)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Outstanding Credit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">
              {report.credit.outstandingBalance === null ? "Needs reconciliation" : formatCurrency(report.credit.outstandingBalance)}
            </div>
            <p className="text-sm text-muted-foreground">
              {report.credit.activeBalances === null ? "Credit totals are temporarily unavailable" : `${report.credit.activeBalances} customers with balances`}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Unallocated Historical Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">{report.unallocatedSalesCount ?? "Unavailable"}</div>
            <p className="text-sm text-muted-foreground">
              Sales without FIFO allocation lineage in selected period
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div id="tour-reports-margin">
          <Card>
            <CardHeader>
              <CardTitle>Recent Sales Margin</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sale</TableHead>
                    <TableHead className="text-right">Revenue</TableHead>
                    <TableHead className="text-right">COGS</TableHead>
                    <TableHead className="text-right">Gross Profit</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {report.recentSales.length === 0 ? <TableRow>
                    <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                      {report.today.salesCount === 0 ? "No completed sales in this window." : "Recent sale details are unavailable for this window."}
                    </TableCell>
                  </TableRow> : report.recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs">{sale.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(sale.total)}</TableCell>
                      <TableCell className="text-right">—</TableCell>
                      <TableCell className="text-right">—</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
          <CardTitle>{report.period.mode === "custom" ? "Top Products in Selected Window" : "Top Products This Week"}</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qty (g)</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.topProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.sku || "N/A"}</TableCell>
                    <TableCell className="text-right">{product.quantitySoldGrams.toLocaleString("en-US", { maximumFractionDigits: 2 })}</TableCell>
                    <TableCell className="text-right">
                      {formatCurrency(product.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div id="tour-reports-lowstock">
          <Card>
            <CardHeader>
              <CardTitle>Low Stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-muted-foreground">
                {report.lowStock.count === null ? "Inventory count is temporarily unavailable." : `${report.lowStock.count} products are at or below reorder level.`}
              </p>
              <div className="space-y-2">
                {report.lowStock.items.slice(0, MAX_LOW_STOCK_ITEMS_DISPLAY).map((item) => (
                  <div key={item.id} className="flex items-center justify-between text-sm">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-muted-foreground">{item.sku}</div>
                    </div>
                    <div className="text-right">
                      <div>{item.quantityOnHand} on hand</div>
                      <div className="text-muted-foreground">Reorder at {item.lowStockThreshold}</div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Period Comparison</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span>{report.period.mode === "custom" ? "Selected Period Revenue" : "This Week Revenue"}</span>
              <span className="font-medium">{formatCurrency(report.week.salesTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{report.period.mode === "custom" ? "Selected Period COGS" : "This Week COGS"}</span>
              <span className="font-medium">{report.week.costOfGoodsSold === null ? "Unavailable" : formatCurrency(report.week.costOfGoodsSold)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>{report.period.mode === "custom" ? "Selected Period Gross Profit" : "This Week Gross Profit"}</span>
              <span className="font-medium">{report.week.grossProfit === null ? "Unavailable" : formatCurrency(report.week.grossProfit)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <span>{report.period.mode === "custom" ? "Previous Period Gross Profit" : "Previous Week Gross Profit"}</span>
              <span className="font-medium">
                {report.previousWeek.grossProfit === null ? "Unavailable" : formatCurrency(report.previousWeek.grossProfit)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground pt-2">
            Latest audit activity: {report.latestAuditAt ? formatDateTime(report.latestAuditAt) : "Unavailable"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <p className="text-muted-foreground">No verified reconciliation result is available for this window.</p>
          </CardContent>
        </Card>
      </div>

      <ReportsTour />
    </div>
  );
}
