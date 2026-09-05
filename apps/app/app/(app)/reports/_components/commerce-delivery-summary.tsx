"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Download, RefreshCw } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { CombinedCommerceDeliverySummary } from "@/lib/reports/commerce-delivery";

function money(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

const rows = [
  ["Orders", "orderCount", "count"],
  ["Gross collected", "grossCollectedCents", "money"],
  ["Net cash activity", "netCashActivityCents", "money"],
  ["Merchandise revenue", "merchandiseRevenueCents", "money"],
  ["Delivery revenue", "deliveryRevenueCents", "money"],
  ["Vendor delivery expense", "vendorDeliveryExpenseCents", "money"],
  ["Delivery tax", "deliveryTaxCents", "money"],
  ["Legacy/unclassified tax", "unclassifiedTaxCents", "money"],
  ["Discounts", "discountCents", "money"],
  ["COGS", "cogsCents", "money"],
  ["Customer fee refunds", "customerFeeRefundCents", "money"],
  ["Delivery tax refunds", "deliveryTaxRefundCents", "money"],
  ["Vendor credits", "vendorCreditsCents", "money"],
  ["Net revenue", "netRevenueCents", "money"],
  ["Gross profit", "grossProfitCents", "money"],
] as const;

export function CommerceDeliverySummary({
  from,
  toExclusive,
}: {
  from: string;
  toExclusive: string;
}) {
  const [summary, setSummary] = useState<CombinedCommerceDeliverySummary | null>(null);
  const [error, setError] = useState<string | null>(null);
  const query = useMemo(
    () => new URLSearchParams({ from, to: toExclusive }).toString(),
    [from, toExclusive],
  );

  useEffect(() => {
    const controller = new AbortController();
    setSummary(null);
    setError(null);
    void fetch(`/api/reports/commerce-delivery?${query}`, {
      signal: controller.signal,
    })
      .then(async (response) => {
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Unable to load combined reporting");
        }
        setSummary(data as CombinedCommerceDeliverySummary);
      })
      .catch((reason) => {
        if (reason instanceof DOMException && reason.name === "AbortError") return;
        setError(
          reason instanceof Error
            ? reason.message
            : "Unable to load combined reporting",
        );
      });
    return () => controller.abort();
  }, [query]);

  if (error) {
    return (
      <Card>
        <CardHeader><CardTitle>Commerce and delivery reconciliation</CardTitle></CardHeader>
        <CardContent className="text-sm text-destructive">{error}</CardContent>
      </Card>
    );
  }
  if (!summary) {
    return (
      <Card>
        <CardContent className="flex items-center gap-2 p-6 text-muted-foreground">
          <RefreshCw className="h-4 w-4 animate-spin" /> Loading both sales ledgers…
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4">
        <div>
          <CardTitle>Combined commerce and delivery reconciliation</CardTitle>
          <p className="mt-1 text-sm text-muted-foreground">
            Canonical mobile/delivery sales and legacy web sales are shown separately, then combined. Matching checkout references are counted once.
          </p>
        </div>
        <Button asChild type="button" variant="outline" size="sm">
          <a href={`/api/reports/commerce-delivery?${query}&format=csv`}>
            <Download className="mr-2 h-4 w-4" /> Export combined CSV
          </a>
        </Button>
      </CardHeader>
      <CardContent className="space-y-4">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Metric</TableHead>
              <TableHead className="text-right">Canonical</TableHead>
              <TableHead className="text-right">Legacy web</TableHead>
              <TableHead className="text-right">
                {summary.canonical.available === false || summary.legacyWeb.available === false ? "Partial total" : "Combined"}
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map(([label, field, unit]) => (
              <TableRow key={field}>
                <TableCell className="font-medium">
                  {label === "Gross profit" && !summary.grossProfitComplete
                    ? "Known gross profit"
                    : label}
                </TableCell>
                <TableCell className="text-right">
                  {summary.canonical.available === false ? "Unavailable" : unit === "money"
                    ? money(summary.canonical.totals[field])
                    : summary.canonical.totals[field]}
                </TableCell>
                <TableCell className="text-right">
                  {summary.legacyWeb.available === false ? "Unavailable" : unit === "money"
                    ? money(summary.legacyWeb.totals[field])
                    : summary.legacyWeb.totals[field]}
                </TableCell>
                <TableCell className="text-right font-semibold">
                  {unit === "money"
                    ? money(summary.combined[field])
                    : summary.combined[field]}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {summary.warnings.length ? (
          <div className="rounded-md border border-amber-500/40 bg-amber-500/10 p-3 text-sm">
            <div className="flex items-center gap-2 font-medium">
              <AlertTriangle className="h-4 w-4" /> Reporting coverage
            </div>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              {summary.warnings.map((warning) => <li key={warning}>{warning}</li>)}
            </ul>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Gross profit includes recorded COGS and vendor delivery expense for both ledgers.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
