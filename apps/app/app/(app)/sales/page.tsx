"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TableSkeleton } from "@/components/skeletons/table-skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import {
  ShoppingCart,
  Plus,
  Search,
  Eye,
  Calendar,
  CreditCard,
  ChevronRight,
} from "lucide-react";
import { useBusiness } from "@/lib/hooks/use-business";

interface SaleRecord {
  id: string;
  total_amount: number;
  payment_method?: string;
  order_status?: string;
  created_at: string;
  items?: any[];
}

export default function SalesHistoryPage() {
  const router = useRouter();
  const { business, loading: businessLoading } = useBusiness();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    if (!business?.id) return;
    const fetchSales = async () => {
      try {
        setLoading(true);
        const res = await fetch("/api/sales?limit=50");
        if (res.ok) {
          const json = await res.json();
          setSales(json.data || []);
        }
      } catch (err) {
        console.error("Failed to load sales history:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchSales();
  }, [business?.id]);

  const filteredSales = sales.filter((sale) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      sale.id.toLowerCase().includes(term) ||
      (sale.payment_method || "").toLowerCase().includes(term) ||
      (sale.order_status || "").toLowerCase().includes(term)
    );
  });

  if (businessLoading || loading) {
    return <TableSkeleton columnCount={5} rowCount={8} />;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 page-transition">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Sales</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Review completed sales, receipts, and order history
          </p>
        </div>
        <Button
          asChild
          className="gap-2 bg-accent text-black hover:bg-accent/90 font-semibold h-11 px-4"
        >
          <Link href="/pos/sale">
            <Plus className="w-4 h-4" />
            Open Point of Sale
          </Link>
        </Button>
      </div>

      <Card className="border-border/80">
        <CardHeader className="p-4 md:p-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg md:text-xl">Recent sales</CardTitle>
            <div className="relative w-full md:w-72">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by ID or payment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-11 text-base md:text-sm"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          {filteredSales.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No sales found"
              description={
                searchTerm
                  ? "No sales match your search term."
                  : "Saved sales will appear here."
              }
              actionLabel="New sale"
              onAction={() => router.push("/pos/sale")}
            />
          ) : (
            <>
              {/* Mobile Stacked Cards */}
              <div className="md:hidden space-y-3">
                {filteredSales.map((sale) => {
                  const dateStr = new Intl.DateTimeFormat("en-US", {
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                  }).format(new Date(sale.created_at));
                  const itemCount = sale.items?.length || 0;

                  return (
                    <Link
                      key={sale.id}
                      href={`/sales/${sale.id}`}
                      className="block p-4 rounded-xl border border-border/80 bg-card hover:bg-muted/40 active:bg-muted/70 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="font-mono text-xs font-semibold text-accent truncate">
                            #{sale.id.slice(0, 8)}
                          </p>
                          <p className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {dateStr}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="font-mono text-base font-bold text-accent">
                            ${Number(sale.total_amount || 0).toFixed(2)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-3 pt-3 border-t border-border/60 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className="capitalize text-[11px] py-0.5 px-2"
                          >
                            <CreditCard className="w-3 h-3 mr-1" />
                            {sale.payment_method || "cash"}
                          </Badge>
                          <span className="text-muted-foreground">
                            {itemCount} {itemCount === 1 ? "item" : "items"}
                          </span>
                        </div>
                        <div className="flex items-center text-muted-foreground font-medium">
                          <span>Details</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Sale ID</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead className="text-right">Total Amount</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => {
                      const dateStr = new Date(
                        sale.created_at,
                      ).toLocaleString();
                      const itemCount = sale.items?.length || 0;
                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="text-sm font-medium">
                            <div className="flex items-center gap-2">
                              <Calendar className="w-4 h-4 text-muted-foreground" />
                              {dateStr}
                            </div>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {sale.id.slice(0, 8)}...
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize">
                              <CreditCard className="w-3 h-3 mr-1" />
                              {sale.payment_method || "cash"}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {itemCount} {itemCount === 1 ? "item" : "items"}
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-accent">
                            ${Number(sale.total_amount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="ghost">
                              <Link href={`/sales/${sale.id}`}>
                                <Eye className="w-4 h-4 mr-1" />
                                View
                              </Link>
                            </Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
