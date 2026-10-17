"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethods } from "@/components/quick-pos/payment-methods";
import { ReceiptChoice } from "@/components/quick-pos/receipt-choice";
import { StatusFeedback } from "@/components/quick-pos/status-feedback";
import { CustomerInline } from "@/components/quick-pos/customer-inline";
import { useQuickPosStore } from "@/lib/quick-pos/store";
import { canUseCredit } from "@/lib/quick-pos/selectors";
import type {
  QuickPosCheckoutResponse,
  QuickPosPaymentMethod,
  QuickPosQuoteResponse,
} from "@/lib/quick-pos/types";
import type { PosAuthoritativeQuote } from "@/lib/pos/types";
import { DeliveryCheckout } from "@/components/quick-pos/delivery-checkout";

export default function QuickPosPaymentPage() {
  const router = useRouter();
  const [quote, setQuote] = useState<PosAuthoritativeQuote | null>(null);
  const [isQuoting, setIsQuoting] = useState(false);
  const [amountTenderedStr, setAmountTenderedStr] = useState<string>("");
  const store = useQuickPosStore();
  const {
    state,
    total,
    setPaymentMethod,
    setReceipt,
    setCreditConfirmed,
    setDelivery,
    setProcessing,
    setError,
    setSuccess,
    markCompleted,
    setIdempotencyKey,
    setCustomer,
  } = useQuickPosStore();

  useEffect(() => {
    if (state.cartItems.length === 0) {
      router.replace("/pos/sale");
    }
  }, [router, state.cartItems.length]);

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
        const response = await fetch("/api/pos/quote", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: "quick",
            customerId: state.customer.id,
            delivery: state.delivery.enabled ? state.delivery : undefined,
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
  }, [state.cartItems, state.customer.id, state.delivery, state.discount, setError]);

  const activeTotal = quote?.total ?? total;
  const allowCredit = canUseCredit(state);
  const customerRemainingCredit = state.customer.remainingCredit ?? 0;
  const creditCoversTotal = allowCredit && customerRemainingCredit >= activeTotal;

  const parsedTendered = parseFloat(amountTenderedStr);
  const numericTendered = !isNaN(parsedTendered) && parsedTendered > 0 ? parsedTendered : undefined;
  const changeDue = numericTendered !== undefined && numericTendered >= activeTotal
    ? Math.round((numericTendered - activeTotal) * 100) / 100
    : 0;

  const quickBills = [5, 10, 20, 50, 100];
  const nextWholeDollar = Math.ceil(activeTotal);

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

    if (state.delivery.enabled && !state.delivery.address.trim()) {
      setError("Delivery address is required");
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

    setProcessing(true);
    setError(null);

    const idempotencyKey =
      state.session.pendingIdempotencyKey ??
      (crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
    if (!state.session.pendingIdempotencyKey) {
      setIdempotencyKey(idempotencyKey);
    }

    try {
      // Submit the complete cart through the canonical server checkout once.
      // The API owns tenant resolution, inventory IDs, and transactionality.
      const payload: Record<string, unknown> = {
        mode: "quick",
        idempotencyKey,
        customerId: state.customer.id,
        payment: state.payment,
        delivery: state.delivery.enabled ? state.delivery : undefined,
        discountAmountCents: state.discount.amountCents || undefined,
        discountReason: state.discount.reason,
        items: state.cartItems,
      };

      if (method === "cash" && numericTendered !== undefined) {
        payload.amountPaid = numericTendered;
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

      <CustomerInline
        attached={state.customer}
        onAttach={(customer) => {
          setCustomer(customer);
          setError(null);
        }}
        onDetach={() => {
          setCustomer({ id: null, phone: "", alias: null, remainingCredit: 0 });
          setError(null);
        }}
      />

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
            state.delivery.feeAllocation === "absorb" &&
            (quote.vendorDeliveryExpense ?? 0) > 0 ? (
              <div className="flex justify-between text-amber-200">
                <dt>Delivery absorbed</dt>
                <dd>
                  ${(quote.vendorDeliveryExpense ?? 0).toFixed(2)} expense
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
              Tendered amount is ${ (activeTotal - numericTendered).toFixed(2) } short of the total
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
          (state.payment.method === "credit" && (!creditCoversTotal || !state.payment.creditConfirmed))
        }
        className="h-16 w-full rounded-lg bg-accent text-2xl font-bold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)] transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Complete Sale"
      >
        {state.ui.processing ? "Processing..." : "Complete Sale"}
      </button>
    </div>
  );
}
