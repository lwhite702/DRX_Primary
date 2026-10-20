"use client";

import { useEffect, useMemo, useState } from "react";
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
  UserPlus,
  UserCheck,
  TrendingUp,
  Truck,
  Undo2,
} from "lucide-react";
import { useBusiness } from "@/lib/hooks/use-business";
import { safeDisplayOrderNumber } from "@/lib/utils/number-formatting";
import { CustomerSelectorModal } from "@/components/pos/customer-selector-modal";
import { useCustomerContext } from "@/components/providers/customer-provider";
import { toast } from "sonner";
import { formatPaymentMethodBadge } from "@/lib/utils/payment-method-label";

interface SaleRecord {
  id: string;
  order_number?: string;
  total_amount: number;
  subtotal?: number;
  discount_amount?: number;
  tax_amount?: number;
  delivery_price?: number;
  payment_method?: string;
  payment_tenders?: Array<{
    method: string;
    amountCents: number;
    reference?: string;
  }>;
  order_type?: string;
  order_status?: string;
  customer_id?: string | null;
  customer_masked?: string | null;
  item_count?: number;
  item_summary?: string | null;
  created_at: string;
  items?: any[];
}

type QuickFilter = "all" | "unattached" | "delivery" | "cash" | "card" | "p2p" | "credit";

export default function SalesHistoryPage() {
  const router = useRouter();
  const { business, loading: businessLoading } = useBusiness();
  const { customers } = useCustomerContext();
  const [sales, setSales] = useState<SaleRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeFilter, setActiveFilter] = useState<QuickFilter>("all");
  const [attachingSaleId, setAttachingSaleId] = useState<string | null>(null);
  const [lastAttachment, setLastAttachment] = useState<{
    saleId: string;
    previousCustomerId: string | null;
  } | null>(null);

  const loadSales = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/sales?limit=100");
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

  useEffect(() => {
    if (!business?.id) return;
    void loadSales();
  }, [business?.id]);

  const handleAttachCustomer = async (customerId: string) => {
    if (!attachingSaleId) return;
    const targetSale = sales.find((s) => s.id === attachingSaleId);
    const previousCustomerId = targetSale?.customer_id ?? null;

    try {
      const res = await fetch(`/api/sales/${attachingSaleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: customerId || null }),
      });
      if (!res.ok) throw new Error("Failed to attach customer");
      setLastAttachment({ saleId: attachingSaleId, previousCustomerId });
      toast.success(
        customerId ? "Customer attached to transaction" : "Customer detached",
      );
      await loadSales();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Could not update customer",
      );
    } finally {
      setAttachingSaleId(null);
    }
  };

  const handleUndoAttachment = async () => {
    if (!lastAttachment) return;
    try {
      const res = await fetch(`/api/sales/${lastAttachment.saleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: lastAttachment.previousCustomerId }),
      });
      if (!res.ok) throw new Error("Failed to undo customer attachment");
      toast.success("Customer attachment undone");
      setLastAttachment(null);
      await loadSales();
    } catch {
      toast.error("Could not undo customer change");
    }
  };

  const metrics = useMemo(() => {
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);
    const completed = sales.filter(
      (s) => (s.order_status || "completed") !== "voided",
    );
    const todaySales = completed.filter(
      (s) => new Date(s.created_at).getTime() >= startOfToday.getTime(),
    );
    const totalRevenue = completed.reduce(
      (sum, s) => sum + Number(s.total_amount || 0),
      0,
    );
    const todayRevenue = todaySales.reduce(
      (sum, s) => sum + Number(s.total_amount || 0),
      0,
    );
    const avgOrder =
      completed.length > 0 ? totalRevenue / completed.length : 0;
    const unattachedCount = completed.filter((s) => !s.customer_id).length;

    return {
      totalRevenue,
      todayRevenue,
      todayCount: todaySales.length,
      completedCount: completed.length,
      avgOrder,
      unattachedCount,
    };
  }, [sales]);

  const filteredSales = useMemo(() => {
    return sales.filter((sale) => {
      const method = (sale.payment_method || "cash").toLowerCase();
      if (activeFilter === "unattached" && sale.customer_id) return false;
      if (
        activeFilter === "delivery" &&
        (sale.order_type || "").toLowerCase() !== "delivery" &&
        !(Number(sale.delivery_price || 0) > 0)
      ) {
        return false;
      }
      if (activeFilter === "cash" && method !== "cash") return false;
      if (activeFilter === "card" && method !== "card") return false;
      if (
        activeFilter === "p2p" &&
        !method.startsWith("p2p_") &&
        method !== "zelle"
      ) {
        return false;
      }
      if (activeFilter === "credit" && method !== "credit") return false;

      if (!searchTerm.trim()) return true;
      const term = searchTerm.toLowerCase();
      const shortOrder = safeDisplayOrderNumber(
        sale.order_number || sale.id,
      ).toLowerCase();
      return (
        shortOrder.includes(term) ||
        sale.id.toLowerCase().includes(term) ||
        (sale.customer_masked || "").toLowerCase().includes(term) ||
        (sale.item_summary || "").toLowerCase().includes(term) ||
        method.includes(term) ||
        (sale.order_status || "").toLowerCase().includes(term)
      );
    });
  }, [sales, activeFilter, searchTerm]);

  if (businessLoading || loading) {
    return <TableSkeleton columnCount={6} rowCount={8} />;
  }

  return (
    <div className="p-4 md:p-8 space-y-6 page-transition">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Sales History</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Track daily progress, view masked customer activity, and attach customers to past transactions
          </p>
        </div>
        <div className="flex items-center gap-2">
          {lastAttachment && (
            <Button
              type="button"
              variant="outline"
              onClick={() => void handleUndoAttachment()}
              className="gap-1.5 h-11"
            >
              <Undo2 className="w-4 h-4" />
              Undo Last Customer Change
            </Button>
          )}
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
      </div>

      {/* KPI Progress & Trend Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
        <Card className="border-border/80">
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Today&apos;s Revenue</span>
              <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
            </div>
            <p className="mt-1 font-mono text-xl md:text-2xl font-bold text-accent">
              ${metrics.todayRevenue.toFixed(2)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {metrics.todayCount} {metrics.todayCount === 1 ? "order" : "orders"} today
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Recent Revenue ({metrics.completedCount})</p>
            <p className="mt-1 font-mono text-xl md:text-2xl font-bold">
              ${metrics.totalRevenue.toFixed(2)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Across loaded transactions
            </p>
          </CardContent>
        </Card>
        <Card className="border-border/80">
          <CardContent className="p-4">
            <p className="text-xs text-muted-foreground">Average Ticket</p>
            <p className="mt-1 font-mono text-xl md:text-2xl font-bold">
              ${metrics.avgOrder.toFixed(2)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Per completed order
            </p>
          </CardContent>
        </Card>
        <Card
          className={`border-border/80 cursor-pointer transition-colors ${
            activeFilter === "unattached" ? "border-amber-500/60 bg-amber-500/5" : ""
          }`}
          onClick={() =>
            setActiveFilter((prev) => (prev === "unattached" ? "all" : "unattached"))
          }
        >
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <span>Unattached Sales</span>
              <UserPlus className="w-3.5 h-3.5 text-amber-400" />
            </div>
            <p className="mt-1 font-mono text-xl md:text-2xl font-bold text-amber-400">
              {metrics.unattachedCount}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Tap to filter &amp; attach customers
            </p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/80">
        <CardHeader className="p-4 md:p-6 space-y-4">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <CardTitle className="text-lg md:text-xl">Transactions</CardTitle>
            <div className="relative w-full md:w-80">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search order #, masked customer, item, payment..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 h-11 text-base md:text-sm"
              />
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5">
            {(
              [
                { id: "all", label: "All Sales" },
                {
                  id: "unattached",
                  label: `Needs Customer (${metrics.unattachedCount})`,
                },
                { id: "delivery", label: "Deliveries" },
                { id: "cash", label: "Cash" },
                { id: "card", label: "Card" },
                { id: "p2p", label: "P2P" },
                { id: "credit", label: "Credit" },
              ] as Array<{ id: QuickFilter; label: string }>
            ).map((pill) => (
              <button
                key={pill.id}
                type="button"
                onClick={() => setActiveFilter(pill.id)}
                className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
                  activeFilter === pill.id
                    ? "bg-accent text-black font-semibold"
                    : "bg-muted/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </CardHeader>
        <CardContent className="p-4 md:p-6 pt-0 md:pt-0">
          {filteredSales.length === 0 ? (
            <EmptyState
              icon={ShoppingCart}
              title="No sales found"
              description={
                searchTerm || activeFilter !== "all"
                  ? "No sales match your current filter or search term."
                  : "Completed sales will appear here."
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
                  const itemCount =
                    sale.item_count ?? sale.items?.length ?? 0;
                  const displayOrderNo = safeDisplayOrderNumber(
                    sale.order_number || sale.id,
                  );

                  return (
                    <div
                      key={sale.id}
                      className="p-4 rounded-xl border border-border/80 bg-card space-y-3"
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2">
                            <Link
                              href={`/sales/${sale.id}`}
                              className="font-mono text-xs font-semibold text-accent hover:underline"
                            >
                              {displayOrderNo}
                            </Link>
                            {(sale.order_type === "delivery" ||
                              Number(sale.delivery_price || 0) > 0) && (
                              <Badge
                                variant="secondary"
                                className="text-[10px] py-0 px-1.5"
                              >
                                <Truck className="w-2.5 h-2.5 mr-1" />
                                Delivery
                              </Badge>
                            )}
                          </div>
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

                      <div className="flex items-center justify-between gap-2 text-xs">
                        {sale.customer_id ? (
                          <span className="inline-flex items-center gap-1.5 font-mono text-xs text-emerald-400">
                            <UserCheck className="w-3.5 h-3.5" />
                            {sale.customer_masked || "Attached Customer"}
                          </span>
                        ) : (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 text-xs gap-1"
                            onClick={() => setAttachingSaleId(sale.id)}
                          >
                            <UserPlus className="w-3 h-3" />
                            Attach Customer
                          </Button>
                        )}
                        <span className="text-muted-foreground truncate max-w-[180px]">
                          {itemCount} {itemCount === 1 ? "item" : "items"}
                          {sale.item_summary ? ` • ${sale.item_summary}` : ""}
                        </span>
                      </div>

                      <div className="pt-2 border-t border-border/60 flex items-center justify-between text-xs">
                        <Badge
                          variant="outline"
                          className="text-[11px] py-0.5 px-2"
                        >
                          <CreditCard className="w-3 h-3 mr-1" />
                          {formatPaymentMethodBadge(
                            sale.payment_method,
                            sale.payment_tenders,
                          )}
                        </Badge>
                        <Link
                          href={`/sales/${sale.id}`}
                          className="flex items-center text-muted-foreground hover:text-foreground font-medium"
                        >
                          <span>Details</span>
                          <ChevronRight className="w-3.5 h-3.5 ml-0.5" />
                        </Link>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Desktop Table */}
              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Order #</TableHead>
                      <TableHead>Date &amp; Time</TableHead>
                      <TableHead>Customer (Masked)</TableHead>
                      <TableHead>Items</TableHead>
                      <TableHead>Payment</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((sale) => {
                      const dateStr = new Intl.DateTimeFormat("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      }).format(new Date(sale.created_at));
                      const itemCount =
                        sale.item_count ?? sale.items?.length ?? 0;
                      const displayOrderNo = safeDisplayOrderNumber(
                        sale.order_number || sale.id,
                      );
                      return (
                        <TableRow key={sale.id}>
                          <TableCell className="font-mono text-xs font-semibold text-accent">
                            <div className="flex items-center gap-1.5">
                              <Link
                                href={`/sales/${sale.id}`}
                                className="hover:underline"
                              >
                                {displayOrderNo}
                              </Link>
                              {(sale.order_type === "delivery" ||
                                Number(sale.delivery_price || 0) > 0) && (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] py-0 px-1.5"
                                >
                                  Delivery
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-muted-foreground" />
                              {dateStr}
                            </div>
                          </TableCell>
                          <TableCell>
                            {sale.customer_id ? (
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="font-mono text-xs border-emerald-500/30 text-emerald-400"
                                >
                                  <UserCheck className="w-3 h-3 mr-1" />
                                  {sale.customer_masked || "Attached"}
                                </Badge>
                                <button
                                  type="button"
                                  onClick={() => setAttachingSaleId(sale.id)}
                                  className="text-[11px] text-muted-foreground hover:text-foreground underline"
                                >
                                  Change
                                </button>
                              </div>
                            ) : (
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                className="h-7 text-xs gap-1 border-dashed"
                                onClick={() => setAttachingSaleId(sale.id)}
                              >
                                <UserPlus className="w-3 h-3" />
                                Attach Customer
                              </Button>
                            )}
                          </TableCell>
                          <TableCell className="text-sm max-w-[240px]">
                            <div className="font-medium">
                              {itemCount} {itemCount === 1 ? "item" : "items"}
                            </div>
                            {sale.item_summary && (
                              <div className="text-xs text-muted-foreground truncate">
                                {sale.item_summary}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">
                              <CreditCard className="w-3 h-3 mr-1" />
                              {formatPaymentMethodBadge(
                                sale.payment_method,
                                sale.payment_tenders,
                              )}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right font-mono font-bold text-accent">
                            ${Number(sale.total_amount || 0).toFixed(2)}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button asChild size="sm" variant="ghost">
                              <Link href={`/sales/${sale.id}`}>
                                <Eye className="w-4 h-4 mr-1" />
                                View / Edit
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

      <CustomerSelectorModal
        open={Boolean(attachingSaleId)}
        onOpenChange={(open) => {
          if (!open) setAttachingSaleId(null);
        }}
        customers={customers}
        onSelect={handleAttachCustomer}
        selectedCustomerId={
          sales.find((s) => s.id === attachingSaleId)?.customer_id || undefined
        }
      />
    </div>
  );
}
