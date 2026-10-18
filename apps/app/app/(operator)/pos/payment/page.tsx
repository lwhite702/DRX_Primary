"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  formatPaymentMethodLabel,
  isP2PPaymentMethod,
  P2P_OPTIONS,
  PaymentMethods,
} from "@/components/quick-pos/payment-methods";
import { ReceiptChoice } from "@/components/quick-pos/receipt-choice";
import { StatusFeedback } from "@/components/quick-pos/status-feedback";
import { CustomerInline } from "@/components/quick-pos/customer-inline";
import { useQuickPosStore } from "@/lib/quick-pos/store";
import { canUseCredit, getCardProcessorFeeCents } from "@/lib/quick-pos/selectors";
import type {
  QuickPosCheckoutResponse,
  QuickPosPaymentMethod,
  QuickPosPaymentTender,
  QuickPosQuoteResponse,
} from "@/lib/quick-pos/types";
import type { PosAuthoritativeQuote } from "@/lib/pos/types";
import { DeliveryCheckout } from "@/components/quick-pos/delivery-checkout";

const SPLIT_TENDER_METHODS: Array<{
  id: Exclude<QuickPosPaymentMethod, "mixed" | "split">;
  label: string;
}> = [
  { id: "cash", label: "Cash" },
  { id: "card", label: "Card" },
  { id: "p2p_cashapp", label: "Cash App" },
  { id: "p2p_paypal", label: "PayPal" },
  { id: "p2p_zelle", label: "Zelle" },
  { id: "p2p_onepay", label: "OnePay" },
  { id: "p2p_chime", label: "Chime" },
  { id: "p2p_venmo", label: "Venmo" },
  { id: "p2p_other", label: "P2P Other" },
  { id: "credit", label: "Store Credit" },
];

export default function QuickPosPaymentPage() {
  const router = useRouter();
  const [quote, setQuote] = useState<PosAuthoritativeQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [amountTenderedStr, setAmountTenderedStr] = useState<string>("");
  const [editingCustomer, setEditingCustomer] = useState(false);
  const [customCardFeeInput, setCustomCardFeeInput] = useState<string>("");
  const [splitMethod, setSplitMethod] = useState<Exclude<QuickPosPaymentMethod, "mixed" | "split">>("cash");
  const [splitAmountStr, setSplitAmountStr] = useState<string>("");
  const [splitRefStr, setSplitRefStr] = useState<string>("");
  const {
    state,
    total,
    setCustomer,
    undoCustomerChange,
    setPaymentMethod,
    setPaymentDetails,
    setReceipt,
    setCreditConfirmed,
    setDelivery,
    setProcessing,
    setError,
    setSuccess,
    markCompleted,
    setIdempotencyKey,
  } = useQuickPosStore();

  useEffect(() => {
    if (state.cartItems.length === 0) {
      router.replace("/pos/sale");
    }
  }, [router, state.cartItems.length]);

  const baseEstimatedCents = Math.round(total * 100);
  const cardFeeCents =
    state.payment.method === "card" || state.payment.method === "split"
      ? getCardProcessorFeeCents(state, baseEstimatedCents)
      : 0;

  useEffect(() => {
    if (state.cartItems.length === 0) {
      setQuote(null);
      return;
    }

    const controller = new AbortController();
    const loadQuote = async () => {
      setIsQuoting(true);
      setQuote(null);
      try {
        const fees =
          cardFeeCents > 0
            ? [{ type: "card_processor_fee", amount: cardFeeCents / 100 }]
            : undefined;
        const response = await fetch("/api/pos/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "quick",
            customerId: state.customer.id,
            delivery: state.delivery.enabled ? state.delivery : undefined,
            ...(fees ? { fees } : {}),
            discountAmountCents: state.discount.amountCents || undefined,
            discountReason: state.discount.reason,
            items: state.cartItems,
          }),
          signal: controller.signal,
        });
        const data = (await response.json()) as QuickPosQuoteResponse;
        if (!response.ok || !data.success || !data.quote) {
          setError(data.error || "Unable to verify sale total");
          return;
        }
        setQuote(data.quote);
        setError(null);
      } catch (error: unknown) {
        if (error instanceof DOMException && error.name === "AbortError") {
          return;
        }
        setError(
          error instanceof Error
            ? error.message
            : "Unable to verify sale total",
        );
      } finally {
        if (!controller.signal.aborted) {
          setIsQuoting(false);
        }
      }
    };

    void loadQuote();
    return () => controller.abort();
  }, [
    state.cartItems,
    state.customer.id,
    state.delivery,
    state.discount,
    cardFeeCents,
    setError,
  ]);

  const activeTotal = quote?.total ?? total;
  const activeTotalCents = Math.round(activeTotal * 100);
  const allowCredit = canUseCredit(state);
  const customerRemainingCredit = state.customer.remainingCredit ?? 0;
  const creditCoversTotal = allowCredit && customerRemainingCredit >= activeTotal;

  const parsedTendered = parseFloat(amountTenderedStr);
  const numericTendered = !isNaN(parsedTendered) && parsedTendered > 0 ? parsedTendered : undefined;
  const changeDue =
    numericTendered !== undefined && numericTendered >= activeTotal
      ? Math.round((numericTendered - activeTotal) * 100) / 100
      : 0;

  const quickBills = [5, 10, 20, 50, 100];
  const nextWholeDollar = Math.ceil(activeTotal);

  const tenders: QuickPosPaymentTender[] = state.payment.tenders ?? [];
  const splitAllocatedCents = tenders.reduce((sum, t) => sum + t.amountCents, 0);
  const splitRemainingCents = Math.max(0, activeTotalCents - splitAllocatedCents);

  const addSplitTender = (overrideAmountCents?: number) => {
    const cents =
      overrideAmountCents !== undefined
        ? overrideAmountCents
        : Math.round(parseFloat(splitAmountStr || "0") * 100);
    if (!Number.isFinite(cents) || cents <= 0) {
      setError("Enter a valid split payment amount");
      return;
    }
    if (splitMethod === "credit" && !allowCredit) {
      setError("Attach a customer with available credit to use Store Credit in a split payment");
      return;
    }
    const nextTenders: QuickPosPaymentTender[] = [
      ...tenders,
      {
        method: splitMethod,
        amountCents: cents,
        ...(splitRefStr.trim() ? { reference: splitRefStr.trim() } : {}),
      },
    ];
    setPaymentDetails({ tenders: nextTenders });
    setSplitAmountStr("");
    setSplitRefStr("");
    setError(null);
  };

  const removeSplitTender = (index: number) => {
    const nextTenders = tenders.filter((_, idx) => idx !== index);
    setPaymentDetails({ tenders: nextTenders });
  };

  const finalize = async () => {
    const method = state.payment.method;

    if (!method) {
      setError("Select payment method");
      return;
    }

    if (!quote) {
      setError("Wait for the verified total before completing the sale");
      return;
    }

    const isCustomerPickupCar = state.delivery.dispatchType === "customer_pickup_car";
    if (state.delivery.enabled && !isCustomerPickupCar && !state.delivery.address.trim()) {
      setError("Delivery address is required when dispatching a car");
      return;
    }

    if (method === "cash" && numericTendered !== undefined && numericTendered < activeTotal) {
      setError("Amount tendered is less than the sale total");
      return;
    }

    if (method === "credit") {
      if (!allowCredit) {
        setError("Credit unavailable");
        return;
      }
      if (!creditCoversTotal) {
        setError("Customer credit limit is insufficient for this sale total");
        return;
      }
      if (!state.payment.creditConfirmed) {
        setError("Confirm credit payment");
        return;
      }
    }

    if (method === "split") {
      if (tenders.length === 0) {
        setError("Add at least one payment tender to complete a split sale");
        return;
      }
      if (splitAllocatedCents < activeTotalCents && !allowCredit) {
        setError("Split tenders must cover the full sale total");
        return;
      }
    }

    setProcessing(true);
    setError(null);

    const idempotencyKey =
      state.session.pendingIdempotencyKey ??
      (crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
    if (!state.session.pendingIdempotencyKey) {
      setIdempotencyKey(idempotencyKey);
    }

    try {
      const fees =
        cardFeeCents > 0
          ? [{ type: "card_processor_fee", amount: cardFeeCents / 100 }]
          : undefined;
      const payload: Record<string, unknown> = {
        mode: "quick",
        idempotencyKey,
        customerId: state.customer.id,
        payment: {
          method: state.payment.method,
          receipt: state.payment.receipt,
          creditConfirmed: state.payment.creditConfirmed,
          ...(cardFeeCents > 0 ? { cardFeeCents } : {}),
          ...(state.payment.paymentRef?.trim() ? { paymentRef: state.payment.paymentRef.trim() } : {}),
          ...(method === "split" && tenders.length > 0 ? { tenders } : {}),
        },
        ...(state.payment.paymentRef?.trim() ? { paymentRef: state.payment.paymentRef.trim() } : {}),
        ...(method === "split" && tenders.length > 0 ? { paymentTenders: tenders } : {}),
        ...(fees ? { fees } : {}),
        delivery: state.delivery.enabled ? state.delivery : undefined,
        discountAmountCents: state.discount.amountCents || undefined,
        discountReason: state.discount.reason,
        items: state.cartItems,
      };

      if (method === "cash" && numericTendered !== undefined) {
        payload.amountPaid = numericTendered;
      } else if (method === "split") {
        payload.amountPaid = splitAllocatedCents / 100;
      }

      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = (await res.json()) as QuickPosCheckoutResponse;
      if (
        !res.ok ||
        !data.success ||
        !data.saleId ||
        typeof data.total !== "number"
      ) {
        setError(data.error || "Payment failed");
        return;
      }

      markCompleted({
        saleId: data.saleId,
        total: data.total,
        receipt: state.payment.receipt,
        changeAmount: typeof data.changeAmount === "number" ? data.changeAmount : changeDue,
        isDelivery: Boolean(state.delivery.enabled),
      });
      setSuccess("Sale completed");
      router.replace("/pos/complete");
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <StatusFeedback
        error={state.ui.hardError}
        success={state.ui.successMessage}
      />

      {editingCustomer ? (
        <CustomerInline
          attached={state.customer}
          onAttach={(customer) => {
            setCustomer(customer);
            setError(null);
            setEditingCustomer(false);
          }}
          onDetach={() => {
            setCustomer({ id: null, phone: "", alias: null, remainingCredit: 0 });
            setError(null);
            setEditingCustomer(false);
          }}
        />
      ) : state.customer.id ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
          <div>
            <div className="flex items-center gap-2">
              <p className="text-xs font-semibold uppercase tracking-wider text-emerald-300">
                Customer Attached
              </p>
              {state.customer.loyaltyTier &&
                state.customer.loyaltyTier !== "none" &&
                state.customer.loyaltyTier !== "standard" && (
                  <span className="rounded bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                    {state.customer.loyaltyTier}
                  </span>
                )}
            </div>
            <p className="text-base font-bold text-white">
              {state.customer.alias || state.customer.phone || "Attached Customer"}
            </p>
          </div>
          <div className="flex items-center gap-4">
            <div className="text-right">
              <p className="text-xs uppercase tracking-wider text-white/60">
                Available Credit
              </p>
              <p className={`text-base font-bold ${customerRemainingCredit >= activeTotal ? "text-emerald-300" : "text-amber-300"}`}>
                ${customerRemainingCredit.toFixed(2)}
              </p>
            </div>
            <div className="flex items-center gap-1.5">
              {state.previousCustomer && (
                <button
                  type="button"
                  onClick={undoCustomerChange}
                  className="rounded border border-amber-400/40 bg-amber-500/10 px-2.5 py-1 text-xs font-semibold text-amber-300 hover:bg-amber-500/20 transition"
                >
                  Undo
                </button>
              )}
              <button
                type="button"
                onClick={() => setEditingCustomer(true)}
                className="rounded border border-white/20 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/80 hover:bg-white/10 transition"
              >
                Change
              </button>
              <button
                type="button"
                onClick={() =>
                  setCustomer({ id: null, phone: "", alias: null, remainingCredit: 0 })
                }
                className="rounded border border-red-500/30 bg-red-500/10 px-2.5 py-1 text-xs font-semibold text-red-300 hover:bg-red-500/20 transition"
              >
                Detach
              </button>
            </div>
          </div>
        </div>
      ) : state.previousCustomer ? (
        <div className="flex items-center justify-between rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-2.5 text-sm">
          <span className="text-amber-200">
            Detached customer{" "}
            <strong>{state.previousCustomer.alias || state.previousCustomer.phone}</strong>
          </span>
          <button
            type="button"
            onClick={undoCustomerChange}
            className="rounded bg-amber-400 px-3 py-1 text-xs font-bold text-black hover:bg-amber-300 transition"
          >
            Undo Detach
          </button>
        </div>
      ) : (
        <div className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-white">Customer (Optional)</h2>
            <p className="mt-0.5 text-xs text-white/60">
              Look up or quick-create a customer without leaving checkout.
            </p>
          </div>
          <button
            type="button"
            onClick={() => setEditingCustomer(true)}
            className="rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm font-semibold text-white hover:bg-white/10"
          >
            Add customer
          </button>
        </div>
      )}

      <div className="rounded-xl border border-accent/20 bg-gradient-to-br from-accent/10 via-white/5 to-white/0 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          Sale total
        </p>
        <div className="mt-1 text-3xl font-bold text-white">
          ${activeTotal.toFixed(2)}
        </div>
        {isQuoting ? (
          <p className="mt-2 text-sm text-white/60" role="status">
            Verifying prices, discounts, and tax...
          </p>
        ) : quote ? (
          <dl className="mt-3 space-y-1 text-sm text-white/70">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>${(quote.subtotal ?? 0).toFixed(2)}</dd>
            </div>
            {(quote.loyaltyDiscountAmount ?? 0) > 0 ? (
              <div className="flex justify-between text-emerald-300">
                <dt>Discounts</dt>
                <dd>-${(quote.loyaltyDiscountAmount ?? 0).toFixed(2)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt>Merchandise tax</dt>
              <dd>
                $
                {(quote.merchandiseTaxAmount ?? quote.taxAmount ?? 0).toFixed(
                  2,
                )}
              </dd>
            </div>
            {(quote.feesTotal ?? 0) > 0 ? (
              <div className="flex justify-between text-amber-200">
                <dt>Card processor fee</dt>
                <dd>${(quote.feesTotal ?? 0).toFixed(2)}</dd>
              </div>
            ) : null}
            {(quote.deliveryRevenue ?? 0) > 0 ? (
              <div className="flex justify-between">
                <dt>Delivery charged</dt>
                <dd>${(quote.deliveryRevenue ?? 0).toFixed(2)}</dd>
              </div>
            ) : null}
            {(quote.deliveryTaxAmount ?? 0) > 0 ? (
              <div className="flex justify-between">
                <dt>Delivery tax</dt>
                <dd>${(quote.deliveryTaxAmount ?? 0).toFixed(2)}</dd>
              </div>
            ) : null}
            {state.delivery.enabled &&
            ((state.delivery.feeAllocation === "absorb" && (quote.vendorDeliveryExpense ?? 0) > 0) ||
              Math.max(0, (quote.vendorDeliveryExpense ?? 0) - (quote.deliveryRevenue ?? 0)) > 0) ? (
              <div className="flex justify-between text-amber-200">
                <dt>Delivery absorbed</dt>
                <dd>
                  $
                  {Math.max(
                    0,
                    (quote.vendorDeliveryExpense ?? 0) - (quote.deliveryRevenue ?? 0),
                  ).toFixed(2)}{" "}
                  expense
                </dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </div>

      <DeliveryCheckout delivery={state.delivery} onChange={setDelivery} />

      <PaymentMethods
        selected={state.payment.method}
        onSelect={(method: QuickPosPaymentMethod) => {
          if (method === "credit" && !allowCredit) {
            setError("Credit unavailable");
            return;
          }
          setPaymentMethod(method);
          setError(null);
        }}
        allowCredit={allowCredit}
      />

      {/* Card Processor Fee Panel */}
      {state.payment.method === "card" ? (
        <section
          className="space-y-3 rounded-xl border border-white/10 bg-[#0A0A0A] p-4 shadow-sm"
          aria-labelledby="card-fee-heading"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 id="card-fee-heading" className="text-lg font-semibold text-white">
                Card Processor Fee
              </h2>
              <p className="text-xs text-white/60">
                {state.cardFeePolicy?.enabled
                  ? state.cardFeePolicy.feeType === "flat"
                    ? `Default flat fee ($${(state.cardFeePolicy.feeFlatCents / 100).toFixed(2)})`
                    : state.cardFeePolicy.feeType === "both"
                      ? `Default ${(state.cardFeePolicy.feeBps / 100).toFixed(2)}% + $${(state.cardFeePolicy.feeFlatCents / 100).toFixed(2)} card fee`
                      : `Default ${(state.cardFeePolicy.feeBps / 100).toFixed(2)}% card fee`
                  : "Optional processor surcharge passed to customer"}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold text-amber-300">
                +${(cardFeeCents / 100).toFixed(2)}
              </span>
              <button
                type="button"
                onClick={() =>
                  setPaymentDetails({
                    cardFeeWaived: !state.payment.cardFeeWaived,
                    cardFeeCustomCents: null,
                  })
                }
                className="rounded border border-white/15 bg-white/5 px-2.5 py-1 text-xs font-semibold text-white/90 hover:bg-white/10 transition"
              >
                {state.payment.cardFeeWaived ? "Restore Fee" : "Waive Fee"}
              </button>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-2">
            <div>
              <label htmlFor="card-custom-fee-input" className="block text-xs text-white/60 mb-1">
                Custom Processor Fee ($)
              </label>
              <div className="flex items-center gap-1.5">
                <input
                  id="card-custom-fee-input"
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder={(cardFeeCents / 100).toFixed(2)}
                  value={customCardFeeInput}
                  onChange={(e) => {
                    const val = e.target.value;
                    setCustomCardFeeInput(val);
                    const num = parseFloat(val);
                    if (!isNaN(num) && num >= 0) {
                      setPaymentDetails({
                        cardFeeWaived: false,
                        cardFeeCustomCents: Math.round(num * 100),
                      });
                    } else if (val === "") {
                      setPaymentDetails({ cardFeeCustomCents: null });
                    }
                  }}
                  className="h-10 flex-1 rounded-md border border-white/15 bg-black/60 px-3 text-sm text-white focus:border-accent focus:outline-none"
                />
                {[2.5, 3.5, 4.0].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      const calcCents = Math.round((baseEstimatedCents * pct) / 100);
                      setCustomCardFeeInput((calcCents / 100).toFixed(2));
                      setPaymentDetails({
                        cardFeeWaived: false,
                        cardFeeCustomCents: calcCents,
                      });
                    }}
                    className="h-10 rounded border border-white/10 bg-white/5 px-2 text-xs font-semibold text-white/80 hover:bg-white/10"
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label htmlFor="card-auth-ref" className="block text-xs text-white/60 mb-1">
                Terminal / Auth Reference (Optional)
              </label>
              <input
                id="card-auth-ref"
                type="text"
                placeholder="e.g. AUTH-4821"
                value={state.payment.paymentRef ?? ""}
                onChange={(e) => setPaymentDetails({ paymentRef: e.target.value })}
                className="h-10 w-full rounded-md border border-white/15 bg-black/60 px-3 text-sm text-white focus:border-accent focus:outline-none"
              />
            </div>
          </div>
        </section>
      ) : null}

      {/* P2P Payment Details Panel */}
      {isP2PPaymentMethod(state.payment.method) ? (
        <section
          className="space-y-3 rounded-xl border border-white/10 bg-[#0A0A0A] p-4 shadow-sm"
          aria-labelledby="p2p-payment-heading"
        >
          <div className="flex items-center justify-between">
            <h2 id="p2p-payment-heading" className="text-lg font-semibold text-white">
              {P2P_OPTIONS.find((o) => o.id === state.payment.method)?.label ?? "P2P"} Payment
            </h2>
            <span className="text-sm font-bold text-accent">
              ${activeTotal.toFixed(2)}
            </span>
          </div>
          <div>
            <label htmlFor="p2p-reference-input" className="block text-xs text-white/60 mb-1">
              Sender Handle / Transaction Note (Optional)
            </label>
            <input
              id="p2p-reference-input"
              type="text"
              placeholder="e.g. $cashtag, @handle, or confirmation #"
              value={state.payment.paymentRef ?? ""}
              onChange={(e) => setPaymentDetails({ paymentRef: e.target.value })}
              className="h-11 w-full rounded-md border border-white/15 bg-black/60 px-3 text-sm text-white focus:border-accent focus:outline-none"
            />
          </div>
        </section>
      ) : null}

      {/* Split / Multi-Tender Payment Panel */}
      {state.payment.method === "split" ? (
        <section
          className="space-y-3 rounded-xl border border-white/10 bg-[#0A0A0A] p-4 shadow-sm"
          aria-labelledby="split-payment-heading"
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 id="split-payment-heading" className="text-lg font-semibold text-white">
                Split Payment (Multi-Tender)
              </h2>
              <p className="text-xs text-white/60">
                Combine Cash, Card, P2P, or Store Credit on a single transaction.
              </p>
            </div>
            <div className="text-right">
              <span className="block text-xs uppercase tracking-wider text-white/60">
                Remaining Balance
              </span>
              <span
                className={
                  "text-lg font-bold " +
                  (splitRemainingCents === 0 ? "text-emerald-400" : "text-amber-300")
                }
              >
                ${(splitRemainingCents / 100).toFixed(2)}
              </span>
            </div>
          </div>

          {tenders.length > 0 && (
            <div className="space-y-1.5">
              {tenders.map((tender, idx) => (
                <div
                  key={`${tender.method}-${idx}`}
                  className="flex items-center justify-between rounded-md border border-white/10 bg-black/50 px-3 py-2 text-sm"
                >
                  <div>
                    <span className="font-semibold text-white">
                      {formatPaymentMethodLabel(tender.method)}
                    </span>
                    {tender.reference && (
                      <span className="ml-2 text-xs text-white/60">
                        ({tender.reference})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-bold text-accent">
                      ${(tender.amountCents / 100).toFixed(2)}
                    </span>
                    <button
                      type="button"
                      onClick={() => removeSplitTender(idx)}
                      className="text-xs text-red-400 hover:text-red-300 underline"
                    >
                      Remove
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid gap-2 sm:grid-cols-4">
            <select
              aria-label="Split tender method"
              value={splitMethod}
              onChange={(e) =>
                setSplitMethod(e.target.value as Exclude<QuickPosPaymentMethod, "mixed" | "split">)
              }
              className="h-11 rounded-md border border-white/15 bg-black px-2.5 text-sm text-white focus:border-accent focus:outline-none"
            >
              {SPLIT_TENDER_METHODS.filter((m) => (m.id === "credit" ? allowCredit : true)).map(
                (m) => (
                  <option key={m.id} value={m.id}>
                    {m.label}
                  </option>
                ),
              )}
            </select>

            <input
              type="number"
              step="0.01"
              min="0"
              placeholder={(splitRemainingCents / 100).toFixed(2)}
              value={splitAmountStr}
              onChange={(e) => setSplitAmountStr(e.target.value)}
              aria-label="Split tender amount"
              className="h-11 rounded-md border border-white/15 bg-black/60 px-3 text-sm text-white focus:border-accent focus:outline-none"
            />

            <input
              type="text"
              placeholder="Ref / handle (optional)"
              value={splitRefStr}
              onChange={(e) => setSplitRefStr(e.target.value)}
              aria-label="Split tender reference"
              className="h-11 rounded-md border border-white/15 bg-black/60 px-3 text-sm text-white focus:border-accent focus:outline-none"
            />

            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => addSplitTender()}
                className="h-11 flex-1 rounded-md bg-accent px-3 text-xs font-bold text-black hover:bg-accent/90 transition"
              >
                + Add
              </button>
              {splitRemainingCents > 0 && (
                <button
                  type="button"
                  onClick={() => addSplitTender(splitRemainingCents)}
                  className="h-11 rounded-md border border-accent/40 bg-accent/15 px-2.5 text-xs font-semibold text-accent hover:bg-accent/25 transition"
                >
                  Rest (${(splitRemainingCents / 100).toFixed(2)})
                </button>
              )}
            </div>
          </div>
        </section>
      ) : null}

      {state.payment.method === "cash" ? (
        <section className="space-y-3 rounded-xl border border-white/10 bg-[#0A0A0A] p-4 shadow-sm" aria-labelledby="cash-tender-heading">
          <div className="flex items-center justify-between">
            <h2 id="cash-tender-heading" className="text-lg font-semibold text-white">
              Cash Tendered
            </h2>
            {numericTendered !== undefined && numericTendered >= activeTotal ? (
              <div className="text-right">
                <span className="text-xs uppercase tracking-wider text-white/60">Change Due: </span>
                <span className="text-lg font-bold text-emerald-400">
                  ${changeDue.toFixed(2)}
                </span>
              </div>
            ) : null}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-lg text-white/50">$</span>
              <input
                id="cash-amount-tendered"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                placeholder={activeTotal.toFixed(2)}
                value={amountTenderedStr}
                onChange={(e) => setAmountTenderedStr(e.target.value)}
                className="h-12 w-full rounded-md border border-white/20 bg-black/60 pl-8 pr-3 text-lg font-semibold text-white placeholder:text-white/30 focus:border-accent focus:outline-none"
                aria-label="Amount tendered"
              />
            </div>
            <button
              type="button"
              onClick={() => setAmountTenderedStr(activeTotal.toFixed(2))}
              className="h-12 rounded-md border border-accent/40 bg-accent/10 px-3 text-sm font-semibold text-accent hover:bg-accent/20 transition"
            >
              Exact
            </button>
            {nextWholeDollar > activeTotal ? (
              <button
                type="button"
                onClick={() => setAmountTenderedStr(nextWholeDollar.toString())}
                className="h-12 rounded-md border border-white/10 bg-white/5 px-3 text-sm font-semibold text-white/90 hover:bg-white/10 transition"
              >
                ${nextWholeDollar}
              </button>
            ) : null}
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {quickBills.map((bill) => (
              <button
                key={bill}
                type="button"
                onClick={() => setAmountTenderedStr(bill.toString())}
                className="rounded-md border border-white/10 bg-white/5 px-3 py-1.5 text-sm font-semibold text-white/90 hover:border-accent/40 hover:bg-accent/10 hover:text-accent transition"
              >
                ${bill}
              </button>
            ))}
          </div>

          {numericTendered !== undefined && numericTendered < activeTotal ? (
            <p className="text-xs text-red-400">
              Tendered amount is ${(activeTotal - numericTendered).toFixed(2)} short of the total
            </p>
          ) : null}
        </section>
      ) : null}

      {state.payment.method === "credit" ? (
        <section className="space-y-3 rounded-xl border border-white/10 bg-[#0A0A0A] p-4 shadow-sm" aria-labelledby="credit-payment-heading">
          <h2 id="credit-payment-heading" className="text-lg font-semibold text-white">
            Customer Credit Account
          </h2>

          <div className="rounded-lg border border-white/10 bg-black/40 p-3 space-y-1.5 text-sm">
            <div className="flex justify-between">
              <span className="text-white/60">Order Total</span>
              <span className="font-semibold text-white">${activeTotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-white/60">Available Store Credit</span>
              <span className={`font-semibold ${customerRemainingCredit >= activeTotal ? "text-emerald-300" : "text-red-400"}`}>
                ${customerRemainingCredit.toFixed(2)}
              </span>
            </div>
            {!creditCoversTotal ? (
              <p className="mt-1 text-xs font-medium text-red-400">
                Insufficient credit. Order total (${activeTotal.toFixed(2)}) exceeds customer credit balance (${customerRemainingCredit.toFixed(2)}).
              </p>
            ) : null}
          </div>

          <label className="flex h-14 items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 text-lg cursor-pointer">
            <input
              type="checkbox"
              checked={state.payment.creditConfirmed}
              onChange={(e) => setCreditConfirmed(e.target.checked)}
              disabled={!creditCoversTotal}
              className="h-5 w-5"
            />
            <span>Confirm credit charge</span>
          </label>
        </section>
      ) : null}

      <ReceiptChoice value={state.payment.receipt} onChange={setReceipt} />

      <button
        type="button"
        onClick={finalize}
        disabled={
          state.ui.processing ||
          isQuoting ||
          !quote ||
          !state.payment.method ||
          (state.payment.method === "cash" && numericTendered !== undefined && numericTendered < activeTotal) ||
          (state.payment.method === "credit" && (!creditCoversTotal || !state.payment.creditConfirmed)) ||
          (state.payment.method === "split" && (tenders.length === 0 || (splitAllocatedCents < activeTotalCents && !allowCredit)))
        }
        className="h-16 w-full rounded-lg bg-accent text-2xl font-bold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)] transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Complete Sale"
      >
        {state.ui.processing ? "Processing..." : "Complete Sale"}
      </button>
    </div>
  );
}
