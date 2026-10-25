"use client";

import { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { safeDisplayOrderNumber } from "@/lib/utils/number-formatting";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { CustomerSelectorModal } from "@/components/pos/customer-selector-modal";
import { Checkbox } from "@/components/ui/checkbox";
import { useBusiness } from "@/lib/hooks/use-business";
import { useUserRole } from "@/lib/hooks/use-user-role";
import { toast } from "sonner";
import {
  ArrowLeft,
  User,
  Calendar,
  CreditCard,
  Package,
  Truck,
  Copy,
  ExternalLink,
  Undo2,
  UserX,
  Ban,
  RotateCcw,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";
import { useCustomerContext } from "@/components/providers/customer-provider";
import { AppPageSkeleton } from "@/components/skeletons/app-page-skeleton";
import { formatPaymentMethodBadge } from "@/lib/utils/payment-method-label";

export default function SaleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const saleId = params.id as string;
  const { business } = useBusiness();
  const { isManager } = useUserRole(business?.id);

  const [sale, setSale] = useState<any>(null);
  const [lineItems, setLineItems] = useState<any[]>([]);
  const [customer, setCustomer] = useState<any>(null);
  const [previousCustomerId, setPreviousCustomerId] = useState<
    string | null | undefined
  >(undefined);
  const { customers } = useCustomerContext();
  const [loading, setLoading] = useState(true);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [assigning, setAssigning] = useState(false);

  // Payment Editing State
  const [showPaymentEdit, setShowPaymentEdit] = useState(false);
  const [newPaymentMethod, setNewPaymentMethod] = useState<string>("");
  const [newPaymentRef, setNewPaymentRef] = useState<string>("");
  const [updatingPayment, setUpdatingPayment] = useState(false);

  // Delivery Editing State
  const [vendorFeeDollars, setVendorFeeDollars] = useState<string>("0");
  const [feeSplitMode, setFeeSplitMode] = useState<
    "pass_100" | "absorb_100" | "split_50_50" | "custom"
  >("pass_100");
  const [customerFeeDollars, setCustomerFeeDollars] = useState<string>("0");
  const [dispatchType, setDispatchType] = useState<
    "merchant_dispatch" | "customer_pickup_car"
  >("merchant_dispatch");
  const [etaMinutes, setEtaMinutes] = useState<string>("");
  const [uberTrackingUrl, setUberTrackingUrl] = useState<string>("");
  const [savingDelivery, setSavingDelivery] = useState(false);

  // Void State
  const [showVoidModal, setShowVoidModal] = useState(false);
  const [voidReason, setVoidReason] = useState("");
  const [voidTenderConfirmed, setVoidTenderConfirmed] = useState(false);
  const [voidExternalRef, setVoidExternalRef] = useState("");
  const [submittingVoid, setSubmittingVoid] = useState(false);

  // Refund State
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundReason, setRefundReason] = useState("");
  const [refundDisposition, setRefundDisposition] = useState<"restock" | "scrap">("restock");
  const [refundTenderConfirmed, setRefundTenderConfirmed] = useState(false);
  const [refundExternalRef, setRefundExternalRef] = useState("");
  const [submittingRefund, setSubmittingRefund] = useState(false);

  const hasCardTender = Boolean(
    sale &&
      ((sale.paymentMethod || sale.payment_method) === "card" ||
        ((sale.paymentMethod || sale.payment_method) === "split" &&
          Array.isArray(sale.paymentTenders) &&
          sale.paymentTenders.some((t: any) => t.method === "card"))),
  );

  const requiresTenderConfirmation = Boolean(
    sale &&
      (sale.paymentMethod || sale.payment_method) !== "comp" &&
      (sale.paymentMethod || sale.payment_method) !== "credit" &&
      !((sale.paymentMethod || sale.payment_method) === "split" &&
        Array.isArray(sale.paymentTenders) &&
        sale.paymentTenders.every(
          (t: any) => t.method === "credit" || t.method === "comp",
        )),
  );

  // Initialize edit state when sale loads
  useEffect(() => {
    if (sale) {
      setNewPaymentMethod(sale.paymentMethod || sale.payment_method || "cash");
      setNewPaymentRef(sale.paymentRef || sale.payment_ref || "");
      if (sale.delivery) {
        const vendorCents = Number(sale.delivery.vendorFeeCents ?? 0);
        const custCents = Number(sale.delivery.customerFeeCents ?? 0);
        setVendorFeeDollars((vendorCents / 100).toFixed(2));
        setCustomerFeeDollars((custCents / 100).toFixed(2));
        setFeeSplitMode(
          sale.delivery.feeSplitMode ||
            (custCents === 0 && vendorCents > 0
              ? "absorb_100"
              : custCents === vendorCents
                ? "pass_100"
                : "custom"),
        );
        setDispatchType(sale.delivery.dispatchType || "merchant_dispatch");
        setUberTrackingUrl(sale.delivery.uberTrackingUrl || "");
        if (sale.delivery.estimatedArrivalAt) {
          const remaining = Math.max(
            1,
            Math.round(
              (Number(sale.delivery.estimatedArrivalAt) - Date.now()) / 60_000,
            ),
          );
          setEtaMinutes(String(remaining));
        }
      }
    }
  }, [sale]);

  const handleUpdatePayment = async () => {
    if (!business?.id) return;

    setUpdatingPayment(true);
    try {
      const isP2P =
        newPaymentMethod === "zelle" || newPaymentMethod.startsWith("p2p_");
      const res = await fetch(`/api/sales/${saleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentMethod: newPaymentMethod,
          paymentRef: isP2P ? newPaymentRef : null,
        }),
      });

      if (!res.ok) throw new Error("Failed to update payment");

      toast.success("Payment method updated");

      setSale({
        ...sale,
        paymentMethod: newPaymentMethod,
        paymentRef: isP2P ? newPaymentRef : null,
      });
      setShowPaymentEdit(false);
    } catch (error: any) {
      console.error("Error updating payment:", error);
      toast.error(error.message || "Failed to update payment");
    } finally {
      setUpdatingPayment(false);
    }
  };

  const handleSaveDelivery = async () => {
    if (!sale?.delivery) return;
    setSavingDelivery(true);
    try {
      const vendorFeeCents = Math.max(
        0,
        Math.round((Number(vendorFeeDollars) || 0) * 100),
      );
      const customCustomerCents = Math.min(
        vendorFeeCents,
        Math.max(0, Math.round((Number(customerFeeDollars) || 0) * 100)),
      );
      const customerFeeCents =
        feeSplitMode === "pass_100"
          ? vendorFeeCents
          : feeSplitMode === "absorb_100"
            ? 0
            : feeSplitMode === "split_50_50"
              ? Math.round(vendorFeeCents / 2)
              : customCustomerCents;

      const res = await fetch(`/api/sales/${saleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          delivery: {
            deliveryId: sale.delivery.id,
            vendorFeeCents,
            dispatchType,
            estimatedArrivalMinutes:
              etaMinutes.trim() && Number(etaMinutes) > 0
                ? Math.round(Number(etaMinutes))
                : undefined,
            uberTrackingUrl: uberTrackingUrl.trim() || null,
          },
        }),
      });
      if (!res.ok) throw new Error("Failed to update delivery details");
      toast.success("Delivery & Uber details updated");
      const reloadRes = await fetch(`/api/sales/${saleId}`);
      if (reloadRes.ok) {
        const updatedData = await reloadRes.json();
        setSale(updatedData);
      }
    } catch (error: any) {
      toast.error(error.message || "Could not update delivery details");
    } finally {
      setSavingDelivery(false);
    }
  };

  const handleVoidSale = async () => {
    if (!voidReason.trim()) {
      toast.error("Please provide a reason to void this order");
      return;
    }
    if (requiresTenderConfirmation && !voidTenderConfirmed) {
      toast.error("Please confirm the tender reversal");
      return;
    }
    if (hasCardTender && !voidExternalRef.trim()) {
      toast.error("An external reference is required for card reversals");
      return;
    }
    try {
      setSubmittingVoid(true);
      const res = await fetch(`/api/sales/${saleId}/void`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: voidReason.trim(),
          tenderReversalConfirmed: voidTenderConfirmed,
          externalReference: voidExternalRef.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to void sale");
      }
      toast.success("Order voided successfully");
      setShowVoidModal(false);
      const reload = await fetch(`/api/sales/${saleId}`);
      if (reload.ok) {
        setSale(await reload.json());
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to void sale");
    } finally {
      setSubmittingVoid(false);
    }
  };

  const handleRefundSale = async () => {
    if (!refundReason.trim()) {
      toast.error("Please provide a reason to refund this order");
      return;
    }
    if (requiresTenderConfirmation && !refundTenderConfirmed) {
      toast.error("Please confirm the tender refund");
      return;
    }
    if (hasCardTender && !refundExternalRef.trim()) {
      toast.error("An external reference is required for card refunds");
      return;
    }
    try {
      setSubmittingRefund(true);
      const res = await fetch(`/api/sales/${saleId}/refund`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: refundReason.trim(),
          disposition: refundDisposition,
          tenderRefundConfirmed: refundTenderConfirmed,
          externalReference: refundExternalRef.trim() || undefined,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        throw new Error(json.error || "Failed to refund sale");
      }
      toast.success("Order refunded successfully");
      setShowRefundModal(false);
      const reload = await fetch(`/api/sales/${saleId}`);
      if (reload.ok) {
        setSale(await reload.json());
      }
    } catch (err: any) {
      toast.error(err.message || "Failed to refund sale");
    } finally {
      setSubmittingRefund(false);
    }
  };

  useEffect(() => {
    if (!saleId || !business?.id) return;

    const loadSaleDetails = async () => {
      try {
        const res = await fetch(`/api/sales/${saleId}`);
        if (!res.ok) throw new Error("Failed to load sale details");
        const data = await res.json();

        setSale(data);
        setLineItems(data.items || []);
        setCustomer(data.customer || null);
      } catch (error) {
        console.error("Error loading sale details:", error);
        toast.error("Failed to load sale details");
      } finally {
        setLoading(false);
      }
    };

    loadSaleDetails();
  }, [saleId, business?.id]);

  const handleAssignCustomer = async (customerId: string | null) => {
    if (!business?.id) return;

    const currentPaymentMethod = sale?.paymentMethod || sale?.payment_method;
    if (currentPaymentMethod === "credit" && !isManager) {
      toast.error("Manager or owner role required to reassign credit sales");
      return;
    }

    const prevId = customer?.id ?? sale?.customerId ?? null;
    setAssigning(true);
    try {
      const res = await fetch(`/api/sales/${saleId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: customerId || null,
        }),
      });

      if (!res.ok) throw new Error("Failed to update customer");
      const data = await res.json();

      if (data.success) {
        setPreviousCustomerId(prevId);
        toast.success(
          customerId
            ? "Customer attached to the sale."
            : "Customer detached from the sale.",
        );

        const reloadRes = await fetch(`/api/sales/${saleId}`);
        if (reloadRes.ok) {
          const updatedData = await reloadRes.json();
          setSale(updatedData);
          setCustomer(updatedData.customer || null);
        }
      } else {
        toast.error(data.message || "Failed to update customer");
      }
    } catch (error: any) {
      console.error("Error updating customer:", error);
      toast.error(error.message || "Failed to update customer");
    } finally {
      setAssigning(false);
      setShowCustomerSelector(false);
    }
  };

  if (loading) {
    return <AppPageSkeleton />;
  }

  if (!sale) {
    return (
      <div className="p-4 md:p-8">
        <p>Sale not found</p>
        <Button onClick={() => router.back()} className="mt-4">
          Go Back
        </Button>
      </div>
    );
  }

  const displayCustomerName = customer
    ? [customer.firstName || customer.first_name, customer.lastName || customer.last_name]
        .filter(Boolean)
        .join(" ") ||
      customer.alias ||
      sale.customerMasked ||
      "Attached Customer"
    : null;

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-start gap-3 min-w-0">
          <Button variant="ghost" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl md:text-3xl font-bold">Sale Details</h1>
            <p className="text-muted-foreground mt-1 break-words font-mono">
              Order #{safeDisplayOrderNumber(sale.orderNumber || sale.order_number || sale.id)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {(sale.orderStatus || sale.order_status) === "completed" && isManager && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setVoidReason("");
                  setVoidTenderConfirmed(false);
                  setVoidExternalRef("");
                  setShowVoidModal(true);
                }}
                className="h-8 gap-1.5 text-xs font-semibold text-rose-400 hover:text-rose-300 border-rose-500/30 hover:bg-rose-500/10"
              >
                <Ban className="h-3.5 w-3.5" />
                Void Order
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setRefundReason("");
                  setRefundDisposition("restock");
                  setRefundTenderConfirmed(false);
                  setRefundExternalRef("");
                  setShowRefundModal(true);
                }}
                className="h-8 gap-1.5 text-xs font-semibold text-amber-400 hover:text-amber-300 border-amber-500/30 hover:bg-amber-500/10"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Refund Order
              </Button>
            </>
          )}
          <Badge
            variant={
              (sale.orderStatus || sale.order_status) === "completed"
                ? "default"
                : (sale.orderStatus || sale.order_status) === "cancelled"
                  ? "destructive"
                  : "secondary"
            }
            className={
              (sale.orderStatus || sale.order_status) === "refunded"
                ? "border-amber-500/30 bg-amber-500/10 text-amber-400 font-semibold uppercase text-xs"
                : (sale.orderStatus || sale.order_status) === "cancelled"
                  ? "border-rose-500/30 bg-rose-500/10 text-rose-400 font-semibold uppercase text-xs"
                  : "uppercase text-xs"
            }
          >
            {(sale.orderStatus || sale.order_status) === "cancelled"
              ? "Voided"
              : (sale.orderStatus || sale.order_status)}
          </Badge>
        </div>
      </div>

      {/* Prominent Void / Refund Audit Banners */}
      {(sale.orderStatus || sale.order_status) === "cancelled" && (
        <div className="rounded-lg border border-rose-500/40 bg-rose-950/20 p-4 text-rose-200 flex items-start gap-3">
          <Ban className="h-5 w-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-base text-rose-300">
              This order has been voided
            </h3>
            <p className="text-sm">
              <span className="font-medium text-rose-100">Reason:</span>{" "}
              {sale.voidReason || "Voided by operator"}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-rose-300/80 pt-1">
              {sale.voidedAt && (
                <span>
                  Voided on {new Date(sale.voidedAt).toLocaleString()}
                </span>
              )}
              {sale.voidSettlementStatus && (
                <span>
                  Settlement: {sale.voidSettlementStatus}
                  {sale.voidReference ? ` (Ref: ${sale.voidReference})` : ""}
                </span>
              )}
              <span>Allocated inventory has been restored to stock.</span>
            </div>
          </div>
        </div>
      )}

      {(sale.orderStatus || sale.order_status) === "refunded" && (
        <div className="rounded-lg border border-amber-500/40 bg-amber-950/20 p-4 text-amber-200 flex items-start gap-3">
          <RotateCcw className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h3 className="font-semibold text-base text-amber-300">
              This order has been refunded
            </h3>
            <p className="text-sm">
              <span className="font-medium text-amber-100">Reason:</span>{" "}
              {sale.refundReason || "Refunded by operator"}
            </p>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-amber-300/80 pt-1">
              <span>
                Disposition:{" "}
                {sale.refundDisposition === "restock"
                  ? "Restocked to inventory"
                  : "Scrapped / Discarded (Recorded shrink loss)"}
              </span>
              {sale.refundedAt && (
                <span>
                  Refunded on {new Date(sale.refundedAt).toLocaleString()}
                </span>
              )}
              {sale.refundSettlementStatus && (
                <span>
                  Settlement: {sale.refundSettlementStatus}
                  {sale.refundReference ? ` (Ref: ${sale.refundReference})` : ""}
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Sale Information */}
        <div className="lg:col-span-2 space-y-6">
          {/* Summary Card */}
          <Card>
            <CardHeader>
              <CardTitle>Order Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Date</p>
                    <p className="font-medium">
                      {new Date(
                        sale.createdAt || sale.created_at,
                      ).toLocaleString()}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <CreditCard className="h-4 w-4 text-muted-foreground" />
                  <div className="flex-1">
                    <p className="text-sm text-muted-foreground">
                      Payment Method
                    </p>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">
                        {formatPaymentMethodBadge(
                          sale.paymentMethod || sale.payment_method,
                          sale.paymentTenders,
                        )}
                      </p>
                      {isManager && (
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6"
                          onClick={() => setShowPaymentEdit(true)}
                        >
                          <span className="sr-only">Edit</span>
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            width="12"
                            height="12"
                            viewBox="0 0 24 24"
                            fill="none"
                            stroke="currentColor"
                            strokeWidth="2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                          >
                            <path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z" />
                          </svg>
                        </Button>
                      )}
                    </div>
                    {(sale.paymentRef || sale.payment_ref) && (
                      <p className="text-xs text-muted-foreground">
                        Ref: {sale.paymentRef || sale.payment_ref}
                      </p>
                    )}
                    {Array.isArray(sale.paymentTenders) &&
                      sale.paymentTenders.length > 1 && (
                        <div className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                          {sale.paymentTenders.map((t: any, idx: number) => (
                            <div key={idx}>
                              {formatPaymentMethodBadge(t.method)}:{" "}
                              <span className="font-mono">
                                ${(Number(t.amountCents || 0) / 100).toFixed(2)}
                              </span>
                              {t.reference ? ` (${t.reference})` : ""}
                            </div>
                          ))}
                        </div>
                      )}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Package className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-sm text-muted-foreground">Order Type</p>
                    <p className="font-medium capitalize">
                      {sale.orderType || sale.order_type}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span>${Number(sale.subtotal || 0).toFixed(2)}</span>
                </div>
                {Number(sale.discountAmount || sale.discount_amount || 0) > 0 && (
                  <div className="flex justify-between text-sm text-emerald-400">
                    <span>Customer / Promo Discount:</span>
                    <span>
                      -$
                      {Number(
                        sale.discountAmount || sale.discount_amount || 0,
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between text-sm">
                  <span>Tax:</span>
                  <span>
                    ${Number(sale.taxAmount || sale.tax_amount || 0).toFixed(2)}
                  </span>
                </div>
                {Number(sale.deliveryPrice || sale.delivery_price || 0) > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Customer Delivery Fee:</span>
                    <span>
                      $
                      {Number(
                        sale.deliveryPrice || sale.delivery_price,
                      ).toFixed(2)}
                    </span>
                  </div>
                )}
                <div className="flex justify-between font-bold text-lg pt-2 border-t">
                  <span>Total:</span>
                  <span>
                    $
                    {Number(sale.totalAmount || sale.total_amount || 0).toFixed(
                      2,
                    )}
                  </span>
                </div>
                {sale.costSummary && (
                  <>
                    <div className="flex justify-between text-sm pt-2 border-t">
                      <span>COGS:</span>
                      <span>
                        $
                        {Number(sale.costSummary.costOfGoodsSold || 0).toFixed(
                          2,
                        )}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Gross Profit:</span>
                      <span>
                        ${Number(sale.costSummary.grossProfit || 0).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Gross Margin:</span>
                      <span>
                        {Number(
                          sale.costSummary.grossMarginPercent || 0,
                        ).toFixed(2)}
                        %
                      </span>
                    </div>
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Delivery / Uber Management Card */}
          {sale.delivery && (
            <Card className="border-border/80">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Truck className="h-5 w-5 text-accent" />
                  Delivery &amp; Uber Dispatch
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDispatchType("merchant_dispatch")}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                      dispatchType === "merchant_dispatch"
                        ? "border-accent bg-accent/15 font-semibold"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    We Send Car (Merchant Dispatch)
                  </button>
                  <button
                    type="button"
                    onClick={() => setDispatchType("customer_pickup_car")}
                    className={`rounded-lg border px-3 py-2 text-left text-xs transition-colors ${
                      dispatchType === "customer_pickup_car"
                        ? "border-accent bg-accent/15 font-semibold"
                        : "border-border bg-card text-muted-foreground"
                    }`}
                  >
                    Customer Sends Car (Pickup)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1.5">
                    <Label htmlFor="detail-uber-cost">Uber / Courier Amount ($)</Label>
                    <Input
                      id="detail-uber-cost"
                      type="number"
                      min="0"
                      step="0.01"
                      value={vendorFeeDollars}
                      onChange={(e) => setVendorFeeDollars(e.target.value)}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="detail-eta-mins">Estimated Arrival (mins)</Label>
                    <Input
                      id="detail-eta-mins"
                      type="number"
                      min="1"
                      max="1440"
                      placeholder="e.g. 25"
                      value={etaMinutes}
                      onChange={(e) => setEtaMinutes(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Cost Split Mode</Label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {(
                      [
                        { id: "pass_100", label: "Pass 100%" },
                        { id: "absorb_100", label: "Pass 0% (Absorb)" },
                        { id: "split_50_50", label: "Split 50/50" },
                        { id: "custom", label: "Custom $" },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setFeeSplitMode(opt.id)}
                        className={`rounded-lg border px-2.5 py-1.5 text-xs transition-colors ${
                          feeSplitMode === opt.id
                            ? "border-accent bg-accent/15 font-semibold"
                            : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {feeSplitMode === "custom" && (
                    <div className="pt-1">
                      <Label htmlFor="detail-custom-fee" className="text-xs">
                        Amount Passed to Customer ($)
                      </Label>
                      <Input
                        id="detail-custom-fee"
                        type="number"
                        min="0"
                        step="0.01"
                        value={customerFeeDollars}
                        onChange={(e) => setCustomerFeeDollars(e.target.value)}
                        className="mt-1"
                      />
                    </div>
                  )}
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="detail-uber-link">Uber Tracking Link</Label>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        onClick={async () => {
                          try {
                            const clip = await navigator.clipboard.readText();
                            if (clip.trim()) {
                              setUberTrackingUrl(clip.trim());
                              toast.success("Uber link pasted");
                            }
                          } catch {
                            toast.error("Paste directly into the field");
                          }
                        }}
                      >
                        Paste
                      </Button>
                      {uberTrackingUrl.trim() && (
                        <>
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-2 text-xs"
                            onClick={async () => {
                              try {
                                await navigator.clipboard.writeText(
                                  uberTrackingUrl.trim(),
                                );
                                toast.success("Uber link copied");
                              } catch {
                                toast.error("Could not copy link");
                              }
                            }}
                          >
                            <Copy className="h-3 w-3 mr-1" />
                            Copy
                          </Button>
                          <a
                            href={uberTrackingUrl.trim()}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-accent hover:underline px-1.5"
                          >
                            <ExternalLink className="h-3 w-3" />
                            Open
                          </a>
                        </>
                      )}
                    </div>
                  </div>
                  <Input
                    id="detail-uber-link"
                    type="url"
                    placeholder="https://m.uber.com/ul/..."
                    value={uberTrackingUrl}
                    onChange={(e) => setUberTrackingUrl(e.target.value)}
                  />
                </div>

                <Button
                  type="button"
                  onClick={() => void handleSaveDelivery()}
                  disabled={savingDelivery}
                >
                  {savingDelivery ? "Saving..." : "Save Delivery & Uber Details"}
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Payment Edit Dialog */}
          <Dialog open={showPaymentEdit} onOpenChange={setShowPaymentEdit}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Update Payment Method</DialogTitle>
                <DialogDescription>
                  Change the payment method for this completed sale.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Payment Method</Label>
                  <Select
                    value={newPaymentMethod}
                    onValueChange={setNewPaymentMethod}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="cash">Cash</SelectItem>
                      <SelectItem value="card">Card</SelectItem>
                      <SelectItem value="p2p_cashapp">P2P • Cash App</SelectItem>
                      <SelectItem value="p2p_paypal">P2P • PayPal</SelectItem>
                      <SelectItem value="p2p_zelle">P2P • Zelle</SelectItem>
                      <SelectItem value="p2p_onepay">P2P • OnePay</SelectItem>
                      <SelectItem value="p2p_chime">P2P • Chime</SelectItem>
                      <SelectItem value="p2p_venmo">P2P • Venmo</SelectItem>
                      <SelectItem value="p2p_other">P2P • Other</SelectItem>
                      <SelectItem value="credit">Store Credit</SelectItem>
                      <SelectItem value="split">Split / Multi-Tender</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {(newPaymentMethod === "zelle" ||
                  newPaymentMethod.startsWith("p2p_")) && (
                  <div className="space-y-2 anim-slide-in">
                    <Label>P2P Handle / Confirmation Reference</Label>
                    <Input
                      value={newPaymentRef}
                      onChange={(e) => setNewPaymentRef(e.target.value)}
                      placeholder="Handle, phone #, or confirmation code"
                    />
                  </div>
                )}

                {newPaymentMethod === "credit" &&
                  (sale.paymentMethod || sale.payment_method) !== "credit" && (
                    <div className="p-3 bg-amber-500/10 text-amber-200 text-sm rounded-lg border border-amber-500/20">
                      Warning: Switching to Credit will not automatically update
                      the customer&apos;s credit balance. Please ensure you manually
                      adjust the credit ledger if necessary.
                    </div>
                  )}
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  variant="outline"
                  onClick={() => setShowPaymentEdit(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdatePayment}
                  disabled={updatingPayment}
                >
                  {updatingPayment ? "Updating..." : "Update Payment"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          {/* Line Items */}
          <Card>
            <CardHeader>
              <CardTitle>Items ({lineItems.length})</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="md:hidden space-y-3">
                {lineItems.map((item) => {
                  const productName =
                    item.productName ||
                    item.inventory?.productName ||
                    item.inventory?.product_name ||
                    "Product";
                  const sku = item.sku || item.inventory?.sku || "—";
                  return (
                    <Card key={item.id} className="border-border/80">
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="font-medium break-words">
                              {productName}
                            </p>
                            <p className="text-sm text-muted-foreground mt-1">
                              SKU: <span className="font-mono">{sku}</span>
                            </p>
                          </div>
                          <p className="font-bold">
                            $
                            {Number(item.lineTotal || item.line_total).toFixed(
                              2,
                            )}
                          </p>
                        </div>

                        <div className="mt-3 grid grid-cols-2 gap-3 text-sm">
                          <div>
                            <p className="text-xs text-muted-foreground">Qty</p>
                            <p className="font-medium">{item.quantity}</p>
                          </div>
                          <div>
                            <p className="text-xs text-muted-foreground">
                              Unit Price
                            </p>
                            <p className="font-medium">
                              $
                              {Number(
                                item.unitPrice || item.unit_price,
                              ).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>

              <div className="hidden md:block">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Product</TableHead>
                      <TableHead>SKU</TableHead>
                      <TableHead className="text-right">Qty</TableHead>
                      <TableHead className="text-right">Price</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {lineItems.map((item) => {
                      const productName =
                        item.productName ||
                        item.inventory?.productName ||
                        item.inventory?.product_name ||
                        "Product";
                      const sku = item.sku || item.inventory?.sku || "—";
                      return (
                        <TableRow key={item.id}>
                          <TableCell className="font-medium">
                            {productName}
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {sku}
                          </TableCell>
                          <TableCell className="text-right">
                            {item.quantity}
                          </TableCell>
                          <TableCell className="text-right">
                            $
                            {Number(item.unitPrice || item.unit_price).toFixed(
                              2,
                            )}
                          </TableCell>
                          <TableCell className="text-right font-mono font-semibold">
                            $
                            {Number(item.lineTotal || item.line_total).toFixed(
                              2,
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Customer Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center justify-between gap-2">
              <span className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Customer
              </span>
              {previousCustomerId !== undefined && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 text-xs gap-1"
                  disabled={assigning}
                  onClick={() => void handleAssignCustomer(previousCustomerId)}
                >
                  <Undo2 className="h-3.5 w-3.5" />
                  Undo
                </Button>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {customer || sale.customerId ? (
              <div className="space-y-3">
                <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400">
                      Attached Customer
                    </span>
                    {sale.customerMasked && (
                      <span className="font-mono text-xs text-muted-foreground">
                        {sale.customerMasked}
                      </span>
                    )}
                  </div>
                  <p className="font-semibold text-base">
                    {displayCustomerName}
                  </p>
                  {(customer?.phoneNumber || customer?.phone_number) && (
                    <p className="font-mono text-xs text-muted-foreground">
                      {customer.phoneNumber || customer.phone_number}
                    </p>
                  )}
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {customer?.loyaltyTier &&
                      customer.loyaltyTier !== "standard" && (
                        <Badge variant="outline" className="text-[10px] uppercase">
                          {customer.loyaltyTier}
                        </Badge>
                      )}
                    {Number(customer?.discountRateBps || 0) > 0 && (
                      <Badge variant="outline" className="text-[10px] text-emerald-400">
                        {(Number(customer.discountRateBps) / 100).toFixed(0)}% Discount
                      </Badge>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => setShowCustomerSelector(true)}
                    disabled={assigning}
                  >
                    Switch Customer
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full text-destructive hover:text-destructive"
                    onClick={() => void handleAssignCustomer(null)}
                    disabled={assigning}
                  >
                    <UserX className="h-4 w-4 mr-1.5" />
                    Detach
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-muted-foreground">
                  No customer attached to this transaction.
                </p>
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => setShowCustomerSelector(true)}
                  disabled={assigning}
                >
                  <User className="h-4 w-4 mr-2" />
                  Attach Customer
                </Button>
              </div>
            )}

            {(sale.paymentMethod || sale.payment_method) === "credit" && (
              <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded-lg">
                <p className="text-xs text-amber-200">
                  ⚠️ This is a credit sale. Manager or owner role required to
                  reassign customer.
                </p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Void Order Dialog */}
      <Dialog open={showVoidModal} onOpenChange={setShowVoidModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-rose-400">
              <Ban className="h-5 w-5" />
              Void Order #{safeDisplayOrderNumber(sale.orderNumber || sale.order_number || sale.id)}
            </DialogTitle>
            <DialogDescription>
              Voiding cancels the transaction, restores allocated inventory to stock, and reverses customer store credit accounting.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Order Total:</span>
                <span className="font-semibold">
                  ${Number(sale.totalAmount || sale.total_amount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Payment Tender:</span>
                <span className="font-medium">
                  {formatPaymentMethodBadge(
                    sale.paymentMethod || sale.payment_method,
                    sale.paymentTenders,
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="void-reason">
                Reason for Void <span className="text-destructive">*</span>
              </Label>
              <Input
                id="void-reason"
                placeholder="e.g., Wrong items scanned, customer walked away"
                value={voidReason}
                onChange={(e) => setVoidReason(e.target.value)}
              />
            </div>

            {hasCardTender && (
              <div className="space-y-2">
                <Label htmlFor="void-card-ref">
                  Card Gateway / Reversal Reference <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="void-card-ref"
                  placeholder="e.g., pos-rev-12345 or auth code"
                  value={voidExternalRef}
                  onChange={(e) => setVoidExternalRef(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Card reversals require an external terminal or gateway reversal reference.
                </p>
              </div>
            )}

            {!hasCardTender && (
              <div className="space-y-2">
                <Label htmlFor="void-opt-ref">
                  External Reference (Optional)
                </Label>
                <Input
                  id="void-opt-ref"
                  placeholder="e.g., Cash App confirmation / note"
                  value={voidExternalRef}
                  onChange={(e) => setVoidExternalRef(e.target.value)}
                />
              </div>
            )}

            {requiresTenderConfirmation && (
              <div className="flex items-start gap-2.5 pt-2">
                <Checkbox
                  id="void-confirm-tender"
                  checked={voidTenderConfirmed}
                  onCheckedChange={(checked) => setVoidTenderConfirmed(Boolean(checked))}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="void-confirm-tender"
                  className="text-xs text-muted-foreground leading-normal cursor-pointer"
                >
                  I confirm that physical tender or payment reversal has been performed with the customer.
                </Label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowVoidModal(false)}
              disabled={submittingVoid}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void handleVoidSale()}
              disabled={
                submittingVoid ||
                !voidReason.trim() ||
                (requiresTenderConfirmation && !voidTenderConfirmed) ||
                (hasCardTender && !voidExternalRef.trim())
              }
            >
              {submittingVoid ? "Voiding..." : "Confirm Void"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Refund Order Dialog */}
      <Dialog open={showRefundModal} onOpenChange={setShowRefundModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-amber-400">
              <RotateCcw className="h-5 w-5" />
              Refund Order #{safeDisplayOrderNumber(sale.orderNumber || sale.order_number || sale.id)}
            </DialogTitle>
            <DialogDescription>
              Record an audited customer refund and choose how items are handled in inventory.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-md bg-muted/50 p-3 text-sm space-y-1">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Refund Total:</span>
                <span className="font-semibold">
                  ${Number(sale.totalAmount || sale.total_amount || 0).toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Original Tender:</span>
                <span className="font-medium">
                  {formatPaymentMethodBadge(
                    sale.paymentMethod || sale.payment_method,
                    sale.paymentTenders,
                  )}
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-disposition">
                Inventory Handling <span className="text-destructive">*</span>
              </Label>
              <Select
                value={refundDisposition}
                onValueChange={(val) => setRefundDisposition(val as "restock" | "scrap")}
              >
                <SelectTrigger id="refund-disposition">
                  <SelectValue placeholder="Select disposition" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="restock">
                    Restock Inventory (Return items to batches)
                  </SelectItem>
                  <SelectItem value="scrap">
                    Scrap / Waste (Discard damaged items; track shrink)
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund-reason">
                Reason for Refund <span className="text-destructive">*</span>
              </Label>
              <Input
                id="refund-reason"
                placeholder="e.g., Defective packaging, wrong weight"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
              />
            </div>

            {hasCardTender && (
              <div className="space-y-2">
                <Label htmlFor="refund-card-ref">
                  Card Gateway / Refund Reference <span className="text-destructive">*</span>
                </Label>
                <Input
                  id="refund-card-ref"
                  placeholder="e.g., refund-tx-9876"
                  value={refundExternalRef}
                  onChange={(e) => setRefundExternalRef(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Card refunds require a gateway refund transaction or confirmation code.
                </p>
              </div>
            )}

            {!hasCardTender && (
              <div className="space-y-2">
                <Label htmlFor="refund-opt-ref">
                  External Reference (Optional)
                </Label>
                <Input
                  id="refund-opt-ref"
                  placeholder="e.g., P2P transaction ID or receipt #"
                  value={refundExternalRef}
                  onChange={(e) => setRefundExternalRef(e.target.value)}
                />
              </div>
            )}

            {requiresTenderConfirmation && (
              <div className="flex items-start gap-2.5 pt-2">
                <Checkbox
                  id="refund-confirm-tender"
                  checked={refundTenderConfirmed}
                  onCheckedChange={(checked) => setRefundTenderConfirmed(Boolean(checked))}
                  className="mt-0.5"
                />
                <Label
                  htmlFor="refund-confirm-tender"
                  className="text-xs text-muted-foreground leading-normal cursor-pointer"
                >
                  I confirm that the refund amount has been returned to the customer.
                </Label>
              </div>
            )}
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowRefundModal(false)}
              disabled={submittingRefund}
            >
              Cancel
            </Button>
            <Button
              className="bg-amber-600 hover:bg-amber-700 text-white font-semibold"
              onClick={() => void handleRefundSale()}
              disabled={
                submittingRefund ||
                !refundReason.trim() ||
                (requiresTenderConfirmation && !refundTenderConfirmed) ||
                (hasCardTender && !refundExternalRef.trim())
              }
            >
              {submittingRefund ? "Refunding..." : "Confirm Refund"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <CustomerSelectorModal
        open={showCustomerSelector}
        onOpenChange={setShowCustomerSelector}
        customers={customers}
        onSelect={(id) => void handleAssignCustomer(id || null)}
        selectedCustomerId={customer?.id || sale.customerId}
      />
    </div>
  );
}
