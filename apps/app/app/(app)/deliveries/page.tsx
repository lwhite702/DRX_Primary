"use client";

import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import {
  AlertTriangle,
  Car,
  CheckCircle2,
  Clock3,
  Copy,
  ExternalLink,
  MapPin,
  PackageCheck,
  RefreshCw,
  Truck,
  UserRoundCheck,
} from "lucide-react";
import { toast } from "sonner";

import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useIsBypassActive } from "@/lib/adapters/auth/ui";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { safeDisplayOrderNumber } from "@/lib/utils/number-formatting";

type DeliveryId = Id<"deliveries">;
type DeliveryStatus =
  | "ready_for_dispatch"
  | "uber_ordered"
  | "handed_off"
  | "delivered"
  | "canceled";

const statusLabels: Record<DeliveryStatus, string> = {
  ready_for_dispatch: "Ready for dispatch",
  uber_ordered: "Uber ordered",
  handed_off: "Handed off",
  delivered: "Delivered",
  canceled: "Canceled",
};

function formatMoney(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

function formatTime(timestamp?: number) {
  if (!timestamp) return "Not set";
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(timestamp);
}

function slaLabel(status: DeliveryStatus, dueAt: number, now: number) {
  if (status === "delivered" || status === "canceled") {
    return { label: "Closed", overdue: false };
  }
  const minutes = Math.ceil((dueAt - now) / 60_000);
  if (minutes < 0) {
    return { label: `${Math.abs(minutes)}m overdue`, overdue: true };
  }
  return { label: `${minutes}m remaining`, overdue: false };
}

export default function DeliveriesPage() {
  const isBypassActive = useIsBypassActive();
  const rawDeliveries = useQuery(api.deliveries.listDeliveries, isBypassActive ? "skip" : {});
  const memberDirectory = useQuery(api.members.listMembers, isBypassActive ? "skip" : {});
  const [selectedId, setSelectedId] = useState<DeliveryId | null>(isBypassActive ? ("del_1048" as DeliveryId) : null);
  const rawDetail = useQuery(
    api.deliveries.getDelivery,
    !isBypassActive && selectedId ? { deliveryId: selectedId } : "skip",
  );
  const rawNotifications = useQuery(
    api.deliveries.listNotifications,
    !isBypassActive && selectedId ? { deliveryId: selectedId } : "skip",
  );

  const bypassDeliveries = useMemo(() => [
    {
      _id: "del_1048" as DeliveryId,
      orderNumber: "DRX-1048",
      status: "ready_for_dispatch" as DeliveryStatus,
      addressLabel: "100 Northstar Way, Suite 4B",
      recipientName: "Sam Reed",
      feeCents: 800,
      customerFeeCents: 800,
      vendorFeeCents: 1600,
      deliveryTaxCents: 66,
      dispatchType: "merchant_dispatch" as const,
      feeSplitMode: "split_50_50" as const,
      uberTrackingUrl: "https://m.uber.com/ul/track-1048",
      dispatchDueAt: Date.now() + 15 * 60_000,
      estimatedArrivalAt: Date.now() + 45 * 60_000,
      saleId: "373e9647-e921-418b-ac2c-23cc3d03aae8",
      assignedToUserId: null,
      createdAt: Date.now() - 10 * 60_000,
      updatedAt: Date.now() - 5 * 60_000,
    }
  ], []);

  const deliveries = isBypassActive ? bypassDeliveries : rawDeliveries;
  const detail = isBypassActive
    ? {
        delivery: bypassDeliveries[0],
        events: [],
        adjustments: [],
        sale: {
          orderNumber: "DRX-1048",
          totalAmount: 108.25,
          subtotal: 100.00,
          paymentMethod: "cash",
        },
      }
    : rawDetail;
  const notifications = isBypassActive ? [] : rawNotifications;
  const assignDelivery = useMutation(api.deliveries.assignDelivery);
  const markUberOrdered = useMutation(api.deliveries.markUberOrdered);
  const updateDeliveryDetails = useMutation(api.deliveries.updateDeliveryDetails);
  const markHandedOff = useMutation(api.deliveries.markHandedOff);
  const markDelivered = useMutation(api.deliveries.markDelivered);
  const cancelDelivery = useMutation(api.deliveries.cancelDelivery);
  const recordFinancialAdjustment = useMutation(api.deliveries.recordFinancialAdjustment);
  const getDeliveryAddress = useMutation(api.deliveries.getDeliveryAddress);

  const [now, setNow] = useState(() => Date.now());
  const [waitMinutes, setWaitMinutes] = useState("15");
  const [assigneeUserId, setAssigneeUserId] = useState("");
  const [revealedAddress, setRevealedAddress] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState("");
  const [adjustmentKind, setAdjustmentKind] = useState<
    "customer_fee_refund" | "delivery_tax_refund" | "vendor_credit"
  >("customer_fee_refund");
  const [adjustmentAmount, setAdjustmentAmount] = useState("");
  const [adjustmentReason, setAdjustmentReason] = useState("");
  const [adjustmentIdempotencyKey, setAdjustmentIdempotencyKey] = useState(
    () => crypto.randomUUID(),
  );
  const [working, setWorking] = useState(false);

  // Editable Uber / Delivery Dispatch state
  const [dispatchType, setDispatchType] = useState<
    "merchant_dispatch" | "customer_pickup_car"
  >("merchant_dispatch");
  const [vendorFeeDollars, setVendorFeeDollars] = useState("0.00");
  const [feeSplitMode, setFeeSplitMode] = useState<
    "pass_100" | "absorb_100" | "split_50_50" | "custom"
  >("pass_100");
  const [customerFeeDollars, setCustomerFeeDollars] = useState("0.00");
  const [uberTrackingUrl, setUberTrackingUrl] = useState("");

  useEffect(() => {
    const timer = window.setInterval(() => setNow(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, []);

  const selected = detail?.delivery;

  useEffect(() => {
    setRevealedAddress(null);
    setAssigneeUserId("");
    setCancellationReason("");
    setAdjustmentAmount("");
    setAdjustmentReason("");
    setAdjustmentIdempotencyKey(crypto.randomUUID());
  }, [selectedId]);

  useEffect(() => {
    if (!selected) return;
    const vendorCents = Number(selected.vendorFeeCents ?? 0);
    const custCents = Number(selected.customerFeeCents ?? 0);
    setVendorFeeDollars((vendorCents / 100).toFixed(2));
    setCustomerFeeDollars((custCents / 100).toFixed(2));
    setDispatchType(
      (selected as any).dispatchType === "customer_pickup_car"
        ? "customer_pickup_car"
        : "merchant_dispatch",
    );
    setFeeSplitMode(
      (selected as any).feeSplitMode ||
        (custCents === 0 && vendorCents > 0
          ? "absorb_100"
          : custCents === vendorCents
            ? "pass_100"
            : Math.abs(custCents - Math.round(vendorCents / 2)) <= 1 && vendorCents > 0
              ? "split_50_50"
              : "custom"),
    );
    setUberTrackingUrl((selected as any).uberTrackingUrl || "");
    if (selected.estimatedArrivalAt) {
      const mins = Math.max(
        1,
        Math.round((selected.estimatedArrivalAt - Date.now()) / 60_000),
      );
      setWaitMinutes(String(mins));
    }
  }, [selected]);

  const activeCount = useMemo(
    () =>
      deliveries?.filter(
        (delivery) =>
          delivery.status !== "delivered" && delivery.status !== "canceled",
      ).length ?? 0,
    [deliveries],
  );
  const overdueCount = useMemo(
    () =>
      deliveries?.filter(
        (delivery) =>
          delivery.status !== "delivered" &&
          delivery.status !== "canceled" &&
          (delivery.estimatedArrivalAt ?? delivery.dispatchDueAt) < now,
      ).length ?? 0,
    [deliveries, now],
  );

  async function runAction(action: () => Promise<unknown>, success: string) {
    setWorking(true);
    try {
      await action();
      toast.success(success);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Delivery action failed");
    } finally {
      setWorking(false);
    }
  }

  const selectedDueAt = selected?.estimatedArrivalAt ?? selected?.dispatchDueAt;
  const computedVendorCents = Math.max(
    0,
    Math.round((Number(vendorFeeDollars) || 0) * 100),
  );
  const computedCustomerCents =
    feeSplitMode === "pass_100"
      ? computedVendorCents
      : feeSplitMode === "absorb_100"
        ? 0
        : feeSplitMode === "split_50_50"
          ? Math.round(computedVendorCents / 2)
          : Math.min(
              computedVendorCents,
              Math.max(0, Math.round((Number(customerFeeDollars) || 0) * 100)),
            );
  const computedAbsorbedCents = Math.max(
    0,
    computedVendorCents - computedCustomerCents,
  );

  return (
    <main className="mx-auto w-full max-w-7xl space-y-6 p-4 pb-24 md:p-8">
      <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">Fulfillment operations</p>
          <h1 className="text-3xl font-bold tracking-tight">Deliveries</h1>
          <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
            Manage Uber &amp; courier dispatch, customer pickup cars, cost splits, ETAs, and live tracking links.
          </p>
        </div>
        <div className="flex gap-2">
          <Badge variant="secondary" className="px-3 py-1.5">{activeCount} active</Badge>
          <Badge variant={overdueCount > 0 ? "destructive" : "outline"} className="px-3 py-1.5">
            {overdueCount} overdue
          </Badge>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1.3fr)_minmax(380px,0.8fr)]">
        <section className="space-y-3" aria-label="Delivery queue">
          {deliveries === undefined ? (
            <Card><CardContent className="flex items-center gap-2 p-6 text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" />Loading queue…</CardContent></Card>
          ) : deliveries.length === 0 ? (
            <Card><CardContent className="p-8 text-center"><PackageCheck className="mx-auto mb-3 h-8 w-8 text-muted-foreground" /><p className="font-medium">No deliveries in the queue</p><p className="text-sm text-muted-foreground">Delivery sales appear here immediately after checkout.</p></CardContent></Card>
          ) : deliveries.map((delivery) => {
            const dueAt = delivery.estimatedArrivalAt ?? delivery.dispatchDueAt;
            const sla = slaLabel(delivery.status as DeliveryStatus, dueAt, now);
            const selectedRow = delivery._id === selectedId;
            const isPickupCar = (delivery as any).dispatchType === "customer_pickup_car";
            return (
              <button
                key={delivery._id}
                type="button"
                onClick={() => {
                  setSelectedId(delivery._id);
                  if (typeof window !== "undefined" && window.innerWidth < 1024) {
                    setTimeout(() => {
                      document.getElementById("selected-delivery-panel")?.scrollIntoView({ behavior: "smooth" });
                    }, 50);
                  }
                }}
                className={`w-full rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${selectedRow ? "border-accent bg-accent/10" : "bg-card hover:bg-muted/50"}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="font-semibold">Order {safeDisplayOrderNumber(delivery.orderNumber)}</span>
                      <Badge variant="outline">{statusLabels[delivery.status as DeliveryStatus]}</Badge>
                      <Badge variant="secondary" className="text-[11px]">
                        <Car className="mr-1 h-3 w-3" />
                        {isPickupCar ? "Customer Pickup Car" : "We Send Car"}
                      </Badge>
                    </div>
                    <p className="mt-2 flex items-center gap-1.5 text-sm text-muted-foreground"><MapPin className="h-4 w-4" />{delivery.addressLabel}</p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <UserRoundCheck className="h-3.5 w-3.5" />
                        {delivery.assignedToUserId ? "Assigned" : "Unassigned"}
                      </span>
                      <span>
                        Uber: {formatMoney(delivery.vendorFeeCents)} (Customer: {formatMoney(delivery.customerFeeCents)})
                      </span>
                      {(delivery as any).uberTrackingUrl && (
                        <span className="text-accent font-medium">• Tracking link attached</span>
                      )}
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge variant={sla.overdue ? "destructive" : "secondary"}>{sla.overdue && <AlertTriangle className="mr-1 h-3 w-3" />}{sla.label}</Badge>
                    <p className="mt-2 text-xs text-muted-foreground">ETA / Due {formatTime(dueAt)}</p>
                  </div>
                </div>
              </button>
            );
          })}
        </section>

        <aside aria-label="Selected delivery" id="selected-delivery-panel">
          <Card className="lg:sticky lg:top-6 border-border/80">
            {!selectedId ? (
              <CardContent className="p-8 text-center text-muted-foreground"><Truck className="mx-auto mb-3 h-8 w-8" />Select a delivery to assign it and record each handoff.</CardContent>
            ) : detail === undefined ? (
              <CardContent className="flex items-center gap-2 p-6 text-muted-foreground"><RefreshCw className="h-4 w-4 animate-spin" />Loading delivery…</CardContent>
            ) : selected ? (
              <>
                <CardHeader className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <CardTitle>Order {safeDisplayOrderNumber(selected.orderNumber)}</CardTitle>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="lg:hidden text-xs text-muted-foreground hover:text-foreground"
                        onClick={() => {
                          setSelectedId(null);
                          window.scrollTo({ top: 0, behavior: "smooth" });
                        }}
                      >
                        Back to queue
                      </Button>
                      <Badge variant="outline">{statusLabels[selected.status as DeliveryStatus]}</Badge>
                    </div>
                  </div>
                  {selectedDueAt && (
                    <div className={`flex items-center gap-2 text-sm ${selectedDueAt < now && selected.status !== "delivered" && selected.status !== "canceled" ? "font-medium text-destructive" : "text-muted-foreground"}`}>
                      <Clock3 className="h-4 w-4" />Next deadline / ETA {formatTime(selectedDueAt)}
                    </div>
                  )}
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-2 gap-3 rounded-lg bg-muted p-3 text-sm">
                    <div><p className="text-muted-foreground">Customer charged</p><p className="font-medium">{formatMoney(selected.customerFeeCents)}</p></div>
                    <div><p className="text-muted-foreground">Uber / vendor cost</p><p className="font-medium">{formatMoney(selected.vendorFeeCents)}</p></div>
                    <div><p className="text-muted-foreground">Merchant absorbed</p><p className="font-medium">{formatMoney(Math.max(0, selected.vendorFeeCents - selected.customerFeeCents))}</p></div>
                    <div><p className="text-muted-foreground">Dispatch mode</p><p className="font-medium">{(selected as any).dispatchType === "customer_pickup_car" ? "Customer Pickup Car" : "Merchant Sends Car"}</p></div>
                  </div>

                  {/* Uber Cost, Split Mode, Car Direction, ETA & Tracking Link Editor */}
                  <div className="space-y-3 rounded-xl border border-border/80 bg-muted/20 p-3.5">
                    <h3 className="text-sm font-semibold">Uber &amp; Dispatch Details</h3>

                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() => setDispatchType("merchant_dispatch")}
                        className={`rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                          dispatchType === "merchant_dispatch"
                            ? "border-accent bg-accent/15 font-semibold"
                            : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        We Send Car
                      </button>
                      <button
                        type="button"
                        onClick={() => setDispatchType("customer_pickup_car")}
                        className={`rounded-lg border px-2.5 py-2 text-left text-xs transition-colors ${
                          dispatchType === "customer_pickup_car"
                            ? "border-accent bg-accent/15 font-semibold"
                            : "border-border bg-card text-muted-foreground"
                        }`}
                      >
                        Customer Sends Car
                      </button>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label htmlFor="uber-vendor-cost" className="text-xs">Uber Amount ($)</Label>
                        <Input
                          id="uber-vendor-cost"
                          type="number"
                          min="0"
                          step="0.01"
                          value={vendorFeeDollars}
                          onChange={(e) => setVendorFeeDollars(e.target.value)}
                          className="h-9 text-sm font-mono"
                        />
                      </div>
                      <div className="space-y-1">
                        <Label htmlFor="uber-eta-mins" className="text-xs">ETA (minutes)</Label>
                        <Input
                          id="uber-eta-mins"
                          type="number"
                          min="1"
                          max="1440"
                          value={waitMinutes}
                          onChange={(e) => setWaitMinutes(e.target.value)}
                          className="h-9 text-sm font-mono"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <Label className="text-xs">Cost Split</Label>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(
                          [
                            { id: "pass_100", label: "Pass 100%" },
                            { id: "absorb_100", label: "Pass 0% (Absorb)" },
                            { id: "split_50_50", label: "Split 50/50" },
                            { id: "custom", label: "Custom Split" },
                          ] as const
                        ).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => setFeeSplitMode(opt.id)}
                            className={`rounded-md border px-2 py-1.5 text-xs transition-colors ${
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
                          <Label htmlFor="custom-cust-fee" className="text-xs">
                            Pass to Customer ($)
                          </Label>
                          <Input
                            id="custom-cust-fee"
                            type="number"
                            min="0"
                            step="0.01"
                            value={customerFeeDollars}
                            onChange={(e) => setCustomerFeeDollars(e.target.value)}
                            className="mt-1 h-9 text-sm font-mono"
                          />
                        </div>
                      )}
                      <p className="text-[11px] text-muted-foreground">
                        Customer pays {formatMoney(computedCustomerCents)} • Business absorbs {formatMoney(computedAbsorbedCents)}
                      </p>
                    </div>

                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <Label htmlFor="uber-tracking-url" className="text-xs">Uber Tracking Link</Label>
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-6 px-1.5 text-[11px]"
                            onClick={async () => {
                              try {
                                const text = await navigator.clipboard.readText();
                                if (text.trim()) {
                                  setUberTrackingUrl(text.trim());
                                  toast.success("Tracking link pasted");
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
                                className="h-6 px-1.5 text-[11px]"
                                onClick={async () => {
                                  try {
                                    await navigator.clipboard.writeText(uberTrackingUrl.trim());
                                    toast.success("Tracking link copied");
                                  } catch {
                                    toast.error("Unable to copy link");
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
                                className="inline-flex items-center gap-0.5 text-[11px] text-accent hover:underline px-1"
                              >
                                <ExternalLink className="h-3 w-3" />
                                Open
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                      <Input
                        id="uber-tracking-url"
                        type="url"
                        placeholder="https://m.uber.com/ul/..."
                        value={uberTrackingUrl}
                        onChange={(e) => setUberTrackingUrl(e.target.value)}
                        className="h-9 text-xs"
                      />
                    </div>

                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="w-full"
                      disabled={working}
                      onClick={() =>
                        void runAction(
                          () =>
                            updateDeliveryDetails({
                              deliveryId: selected._id,
                              vendorFeeCents: computedVendorCents,
                              dispatchType,
                              estimatedArrivalMinutes:
                                Number.isSafeInteger(Number(waitMinutes)) &&
                                Number(waitMinutes) > 0
                                  ? Number(waitMinutes)
                                  : undefined,
                              uberTrackingUrl: uberTrackingUrl.trim() || null,
                            }),
                          "Uber & delivery details saved",
                        )
                      }
                    >
                      Save Uber &amp; Split Details
                    </Button>
                  </div>

                  <div className="space-y-2">
                    <Label>Delivery address</Label>
                    {revealedAddress ? <p className="rounded-md border bg-muted p-3 text-sm">{revealedAddress}</p> : <Button type="button" variant="outline" className="w-full" disabled={working} onClick={() => void runAction(async () => { const result = await getDeliveryAddress({ deliveryId: selected._id }); setRevealedAddress(result.address); }, "Address access recorded")}>Reveal address (audited)</Button>}
                  </div>

                  {selected.status !== "delivered" && selected.status !== "canceled" && (
                    <div className="space-y-3 border-t pt-4">
                      <Button type="button" className="w-full" disabled={working} onClick={() => void runAction(() => assignDelivery({ deliveryId: selected._id }), "Delivery assigned to you")}>Assign to me</Button>
                      <div className="space-y-2">
                        <Label htmlFor="assignee">Reassign for shift handoff</Label>
                        <div className="flex gap-2">
                          <select
                            id="assignee"
                            value={assigneeUserId}
                            onChange={(event) => setAssigneeUserId(event.target.value)}
                            className="h-10 min-w-0 flex-1 rounded-md border border-input bg-background px-3 text-sm"
                          >
                            <option value="">Select an active operator</option>
                            {memberDirectory?.members
                              .filter((member) => member.status === "ACTIVE")
                              .map((member) => (
                                <option key={member._id} value={member.clerkUserId}>
                                  {member.name || member.email} — {member.role.toLowerCase()}
                                </option>
                              ))}
                          </select>
                          <Button type="button" variant="outline" disabled={working || !assigneeUserId.trim()} onClick={() => void runAction(() => assignDelivery({ deliveryId: selected._id, assigneeUserId: assigneeUserId.trim() }), "Delivery reassigned")}>Assign</Button>
                        </div>
                      </div>
                    </div>
                  )}

                  {selected.status === "ready_for_dispatch" && (
                    <div className="space-y-2 border-t pt-4">
                      <Label htmlFor="wait-minutes">Dispatch / Mark Uber Ordered (ETA mins)</Label>
                      <div className="flex gap-2">
                        <Input
                          id="wait-minutes"
                          inputMode="numeric"
                          min={1}
                          max={1440}
                          type="number"
                          value={waitMinutes}
                          onChange={(event) => setWaitMinutes(event.target.value)}
                        />
                        <Button
                          type="button"
                          disabled={
                            working ||
                            !Number.isSafeInteger(Number(waitMinutes)) ||
                            Number(waitMinutes) <= 0 ||
                            Number(waitMinutes) > 1440
                          }
                          onClick={() =>
                            void runAction(
                              () =>
                                markUberOrdered({
                                  deliveryId: selected._id,
                                  waitMinutes: Number(waitMinutes),
                                  uberTrackingUrl: uberTrackingUrl.trim() || undefined,
                                  vendorFeeCents: computedVendorCents,
                                }),
                              "Uber ordered; reminders scheduled",
                            )
                          }
                        >
                          Mark ordered
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">The shared queue records reminders two minutes before ETA, at ETA, every five minutes overdue, and manager escalation after the configured delay.</p>
                    </div>
                  )}

                  {selected.status === "uber_ordered" && <Button type="button" className="w-full" disabled={working} onClick={() => void runAction(() => markHandedOff({ deliveryId: selected._id }), "Package handoff recorded")}><Truck className="mr-2 h-4 w-4" />Mark handed off</Button>}
                  {selected.status === "handed_off" && <Button type="button" className="w-full" disabled={working} onClick={() => void runAction(() => markDelivered({ deliveryId: selected._id }), "Delivery completed")}><CheckCircle2 className="mr-2 h-4 w-4" />Mark delivered</Button>}

                  {selected.status !== "delivered" && selected.status !== "canceled" && (
                    <div className="space-y-2 border-t pt-4">
                      <Label htmlFor="cancel-reason">Manager cancellation</Label>
                      <Input id="cancel-reason" value={cancellationReason} onChange={(event) => setCancellationReason(event.target.value)} placeholder="Required audited reason" />
                      <Button type="button" variant="destructive" className="w-full" disabled={working || cancellationReason.trim().length < 3} onClick={() => void runAction(() => cancelDelivery({ deliveryId: selected._id, reason: cancellationReason.trim() }), "Delivery canceled; sale unchanged")}>Cancel delivery</Button>
                    </div>
                  )}

                  <div className="space-y-2 border-t pt-4">
                    <h3 className="font-semibold">Financial adjustment</h3>
                    <p className="text-xs text-muted-foreground">Refunds and vendor credits are appended to the ledger; they never rewrite the sale.</p>
                    <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={adjustmentKind} onChange={(event) => setAdjustmentKind(event.target.value as typeof adjustmentKind)} aria-label="Adjustment type">
                      <option value="customer_fee_refund">Customer fee refund</option>
                      <option value="delivery_tax_refund">Delivery tax refund</option>
                      <option value="vendor_credit">Vendor credit</option>
                    </select>
                    <Input inputMode="decimal" value={adjustmentAmount} onChange={(event) => setAdjustmentAmount(event.target.value)} placeholder="Amount, e.g. 5.00" aria-label="Adjustment amount" />
                    <Input value={adjustmentReason} onChange={(event) => setAdjustmentReason(event.target.value)} placeholder="Required audited reason" aria-label="Adjustment reason" />
                    <Button type="button" variant="outline" className="w-full" disabled={working || !Number.isFinite(Number(adjustmentAmount)) || Number(adjustmentAmount) <= 0 || adjustmentReason.trim().length < 3} onClick={() => void runAction(async () => { await recordFinancialAdjustment({ deliveryId: selected._id, kind: adjustmentKind, idempotencyKey: adjustmentIdempotencyKey, amountCents: Math.round(Number(adjustmentAmount) * 100), reason: adjustmentReason.trim() }); setAdjustmentAmount(""); setAdjustmentReason(""); setAdjustmentIdempotencyKey(crypto.randomUUID()); }, "Financial adjustment recorded")}>Record adjustment</Button>
                  </div>

                  <div className="space-y-2 border-t pt-4">
                    <h3 className="font-semibold">Audit history</h3>
                    {detail.events.length === 0 ? <p className="text-sm text-muted-foreground">No events recorded.</p> : <ol className="space-y-3">{detail.events.map((event) => <li key={event._id} className="border-l-2 pl-3 text-sm"><p className="font-medium">{event.type.replaceAll("_", " ")}</p><p className="text-xs text-muted-foreground">{formatTime(event.createdAt)} · actor {event.actorUserId}</p></li>)}</ol>}
                  </div>

                  {detail.adjustments.length > 0 && <div className="space-y-2 border-t pt-4"><h3 className="font-semibold">Financial history</h3>{detail.adjustments.map((adjustment) => <div key={adjustment._id} className="rounded-md bg-muted p-3 text-sm"><div className="flex justify-between gap-2"><span>{adjustment.kind.replaceAll("_", " ")}</span><strong>{formatMoney(adjustment.amountCents)}</strong></div><p className="mt-1 text-xs text-muted-foreground">{adjustment.reason} · {formatTime(adjustment.createdAt)}</p></div>)}</div>}

                  {notifications && notifications.length > 0 && <div className="space-y-2 border-t pt-4"><h3 className="font-semibold">Reminders</h3>{notifications.slice(-5).reverse().map((notification) => <div key={notification._id} className="rounded-md bg-amber-500/10 p-3 text-sm"><p>{notification.message}</p><p className="mt-1 text-xs text-muted-foreground">{formatTime(notification.createdAt)}</p></div>)}</div>}
                </CardContent>
              </>
            ) : null}
          </Card>
        </aside>
      </div>
    </main>
  );
}
