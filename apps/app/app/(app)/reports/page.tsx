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
import { getPosReconciliationReport } from "@/lib/reports/pos-reconciliation";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import { ReportsTour } from "./_components/ReportsTour";
import { CommerceDeliverySummary } from "./_components/commerce-delivery-summary";

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

  const from = resolvedSearchParams?.from
    ? new Date(resolvedSearchParams.from)
    : undefined;
  const to = resolvedSearchParams?.to
    ? new Date(resolvedSearchParams.to)
    : undefined;
  const range = {
    from: from && !Number.isNaN(from.getTime()) ? from : undefined,
    to: to && !Number.isNaN(to.getTime()) ? to : undefined,
  };

  const [report, reconciliation] = await Promise.all([
    getPosBaselineReport(businessId, range),
    getPosReconciliationReport(businessId, range),
  ]);

  return (
    <div className="p-4 md:p-8 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-muted-foreground mt-2">
          Baseline sales, cost, and margin visibility from the stabilized POS ledger.
        </p>
        <p className="text-xs text-muted-foreground mt-1">
          Window: {formatDateTime(report.period.from)} to {formatDateTime(report.period.to)}
        </p>
        <Link
          href={`/api/reports/pos-reconciliation?from=${encodeURIComponent(report.period.from)}&to=${encodeURIComponent(report.period.to)}&format=csv`}
          className="text-xs text-primary underline underline-offset-4"
        >
          Export reconciliation CSV
        </Link>
      </div>

      <CommerceDeliverySummary
        from={report.period.from}
        toExclusive={new Date(
          new Date(report.period.to).getTime() + 1,
        ).toISOString()}
      />

      <div id="tour-reports-stats" className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Today Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">{formatCurrency(report.today.salesTotal)}</div>
            <p className="text-sm text-muted-foreground">{report.today.salesCount} completed sales</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Today COGS</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">{formatCurrency(report.today.costOfGoodsSold)}</div>
            <p className="text-sm text-muted-foreground">
              Cash collected: {formatCurrency(report.today.cashCollected)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Week Gross Profit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">{formatCurrency(report.week.grossProfit)}</div>
            <p className="text-sm text-muted-foreground">
              Revenue {formatCurrency(report.week.salesTotal)} against COGS{" "}
              {formatCurrency(report.week.costOfGoodsSold)}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Outstanding Credit</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">
              {formatCurrency(report.credit.outstandingBalance)}
            </div>
            <p className="text-sm text-muted-foreground">
              {report.credit.activeBalances} customers with balances
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Unallocated Historical Sales</CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <div className="text-2xl font-bold">{report.unallocatedSalesCount}</div>
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
                  {report.recentSales.map((sale) => (
                    <TableRow key={sale.id}>
                      <TableCell className="font-mono text-xs">{sale.id.slice(0, 8)}</TableCell>
                      <TableCell className="text-right">{formatCurrency(sale.total)}</TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(sale.costOfGoodsSold)}
                      </TableCell>
                      <TableCell className="text-right">
                        {formatCurrency(sale.grossProfit)}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Top Products This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>SKU</TableHead>
                  <TableHead className="text-right">Qty</TableHead>
                  <TableHead className="text-right">Revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.topProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>{product.name}</TableCell>
                    <TableCell>{product.sku || "N/A"}</TableCell>
                    <TableCell className="text-right">{product.quantitySold}</TableCell>
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
                {report.lowStock.count} products are at or below reorder level.
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
              <span>This Week Revenue</span>
              <span className="font-medium">{formatCurrency(report.week.salesTotal)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>This Week COGS</span>
              <span className="font-medium">{formatCurrency(report.week.costOfGoodsSold)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>This Week Gross Profit</span>
              <span className="font-medium">{formatCurrency(report.week.grossProfit)}</span>
            </div>
            <div className="flex items-center justify-between border-t pt-4">
              <span>Previous Week Gross Profit</span>
              <span className="font-medium">
                {formatCurrency(report.previousWeek.grossProfit)}
              </span>
            </div>
            <div className="text-xs text-muted-foreground pt-2">
              Latest audit activity: {report.latestAuditAt ? formatDateTime(report.latestAuditAt) : "None"}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reconciliation Health</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between">
              <span>Sales Checked</span>
              <span className="font-medium">{reconciliation.summary.salesChecked}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Total Discrepancies</span>
              <span className="font-medium">{reconciliation.summary.discrepancies}</span>
            </div>
            <div className="flex items-center justify-between">
              <span>Header vs Line Total Mismatch</span>
              <span className="font-medium">
                {reconciliation.summary.discrepancyByCode.SALE_TOTAL_MISMATCH}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Allocation Gaps</span>
              <span className="font-medium">
                {reconciliation.summary.discrepancyByCode.LINE_ALLOCATION_GAP}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Inventory Log Missing</span>
              <span className="font-medium">
                {reconciliation.summary.discrepancyByCode.INVENTORY_LOG_MISSING}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span>Inventory Log Qty Mismatch</span>
              <span className="font-medium">
                {reconciliation.summary.discrepancyByCode.INVENTORY_LOG_QUANTITY_MISMATCH}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <ReportsTour />
    </div>
  );
}
