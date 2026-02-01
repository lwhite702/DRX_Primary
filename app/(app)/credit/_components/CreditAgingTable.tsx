import React from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface AgingData {
  customer_id: string;
  customer_name: string;
  bucket_1_7: number | string;
  bucket_8_14: number | string;
  bucket_15_30: number | string;
  bucket_31_plus: number | string;
  total_outstanding: number | string;
}

interface CreditAgingTableProps {
  data: AgingData[];
}

export function CreditAgingTable({ data }: CreditAgingTableProps) {
  if (data.length === 0) return null;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Credit Aging Report</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile cards */}
        <div className="md:hidden space-y-3">
          {data.map((aging) => {
            const hasDelinquent = Number(aging.bucket_31_plus) > 0;
            return (
              <Card key={aging.customer_id} className="border-border/80">
                <CardContent className="pt-4">
                  <div className="flex items-start justify-between gap-3">
                    <p className="font-medium break-words">
                      {aging.customer_name}
                    </p>
                    <p className="font-bold">
                      ${Number(aging.total_outstanding).toFixed(2)}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">1–7 Days</p>
                      <p className="font-medium">
                        ${Number(aging.bucket_1_7).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">8–14 Days</p>
                      <p className="font-medium">
                        ${Number(aging.bucket_8_14).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">
                        15–30 Days
                      </p>
                      <p className="font-medium">
                        ${Number(aging.bucket_15_30).toFixed(2)}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">31+ Days</p>
                      <p
                        className={
                          hasDelinquent
                            ? "font-bold text-destructive"
                            : "font-medium"
                        }
                      >
                        ${Number(aging.bucket_31_plus).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Desktop table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Customer</TableHead>
                <TableHead>1-7 Days</TableHead>
                <TableHead>8-14 Days</TableHead>
                <TableHead>15-30 Days</TableHead>
                <TableHead>31+ Days</TableHead>
                <TableHead>Total Outstanding</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {data.map((aging) => (
                <TableRow key={aging.customer_id}>
                  <TableCell className="font-medium">
                    {aging.customer_name}
                  </TableCell>
                  <TableCell>${Number(aging.bucket_1_7).toFixed(2)}</TableCell>
                  <TableCell>${Number(aging.bucket_8_14).toFixed(2)}</TableCell>
                  <TableCell>
                    ${Number(aging.bucket_15_30).toFixed(2)}
                  </TableCell>
                  <TableCell
                    className={
                      Number(aging.bucket_31_plus) > 0
                        ? "text-destructive font-bold"
                        : ""
                    }
                  >
                    ${Number(aging.bucket_31_plus).toFixed(2)}
                  </TableCell>
                  <TableCell className="font-bold">
                    ${Number(aging.total_outstanding).toFixed(2)}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
