import React from "react";
import { format } from "date-fns";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export interface CreditTransaction {
  id: string;
  created_at?: string; // DB field
  transaction_date?: string; // Some inserts use this
  customers?: { first_name: string; last_name: string } | null;
  amount: number;
  transaction_type: string;
  notes?: string;
  status?: string; // e.g. pending, completed
  due_date?: string;
}

interface CreditTransactionsListProps {
  transactions: CreditTransaction[];
}

export function CreditTransactionsList({
  transactions,
}: CreditTransactionsListProps) {
  if (transactions.length === 0) return null;

  const getCustomerName = (tx: CreditTransaction) => {
    if (tx.customers) {
      return `${tx.customers.first_name} ${tx.customers.last_name}`;
    }
    return "Unknown Customer";
  };

  const getStatusColor = (status?: string) => {
    if (!status) return "text-muted-foreground";
    switch (status) {
      case "completed":
        return "text-green-600";
      case "pending":
        return "text-yellow-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getDate = (tx: CreditTransaction) => {
    const d = tx.created_at || tx.transaction_date;
    return d ? format(new Date(d), "MMM d, yyyy") : "-";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Transactions</CardTitle>
      </CardHeader>
      <CardContent>
        {/* Mobile List */}
        <div className="md:hidden space-y-3">
          {transactions.map((tx) => (
            <div key={tx.id} className="p-4 border rounded-lg space-y-2">
              <div className="flex justify-between items-start">
                <div>
                  <p className="font-semibold">{getCustomerName(tx)}</p>
                  <p className="text-xs text-muted-foreground">{getDate(tx)}</p>
                </div>
                <Badge
                  variant={
                    tx.transaction_type === "payment" ? "default" : "secondary"
                  }
                >
                  {tx.transaction_type === "payment" ? "Payment" : "Extension"}
                </Badge>
              </div>
              <div className="flex justify-between items-center pt-2">
                <div className="flex flex-col">
                  <span className="text-sm text-muted-foreground max-w-[150px] truncate">
                    {tx.notes || "-"}
                  </span>
                  {tx.status && (
                    <span
                      className={`text-xs capitalize ${getStatusColor(tx.status)}`}
                    >
                      {tx.status}
                    </span>
                  )}
                </div>
                <span
                  className={`font-bold ${tx.transaction_type === "payment" ? "text-green-600" : "text-red-500"}`}
                >
                  ${Number(tx.amount).toFixed(2)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {/* Desktop Table */}
        <div className="hidden md:block">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Due Date</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Notes</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((tx) => (
                <TableRow key={tx.id}>
                  <TableCell>{getDate(tx)}</TableCell>
                  <TableCell>{getCustomerName(tx)}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        tx.transaction_type === "payment"
                          ? "default"
                          : "secondary"
                      }
                    >
                      {tx.transaction_type === "payment"
                        ? "Payment"
                        : "Extension"}
                    </Badge>
                  </TableCell>
                  <TableCell
                    className={
                      tx.transaction_type === "payment"
                        ? "text-green-600 font-bold"
                        : "text-red-500 font-bold"
                    }
                  >
                    ${Number(tx.amount).toFixed(2)}
                  </TableCell>
                  <TableCell>
                    {tx.due_date
                      ? format(new Date(tx.due_date), "MMM d, yyyy")
                      : "-"}
                  </TableCell>
                  <TableCell
                    className={`capitalize ${getStatusColor(tx.status)}`}
                  >
                    {tx.status || "-"}
                  </TableCell>
                  <TableCell
                    className="max-w-[200px] truncate"
                    title={tx.notes || ""}
                  >
                    {tx.notes || "-"}
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
