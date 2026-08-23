"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethods } from "@/components/quick-pos/payment-methods";
import { ReceiptChoice } from "@/components/quick-pos/receipt-choice";
import { StatusFeedback } from "@/components/quick-pos/status-feedback";
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
  }, [state.cartItems, state.customer.id, state.delivery, setError]);

  const allowCredit = canUseCredit(state);

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

    if (method === "credit" && !allowCredit) {
      setError("Credit unavailable");
      return;
    }

    if (method === "credit" && !state.payment.creditConfirmed) {
      setError("Confirm credit payment");
      return;
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
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "quick",
          idempotencyKey,
          customerId: state.customer.id,
          payment: state.payment,
          delivery: state.delivery.enabled ? state.delivery : undefined,
          items: state.cartItems,
        }),
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

      <div className="rounded-xl border border-accent/20 bg-gradient-to-br from-accent/10 via-white/5 to-white/0 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          Quick Sale Total
        </p>
        <div className="mt-1 text-3xl font-bold text-white">
          ${(quote?.total ?? total).toFixed(2)}
        </div>
        {isQuoting ? (
          <p className="mt-2 text-sm text-white/60" role="status">
            Verifying prices, discounts, and tax...
          </p>
        ) : quote ? (
          <dl className="mt-3 space-y-1 text-sm text-white/70">
            <div className="flex justify-between">
              <dt>Subtotal</dt>
              <dd>${quote.subtotal.toFixed(2)}</dd>
            </div>
            {quote.loyaltyDiscountAmount > 0 ? (
              <div className="flex justify-between text-emerald-300">
                <dt>Discounts</dt>
                <dd>-${quote.loyaltyDiscountAmount.toFixed(2)}</dd>
              </div>
            ) : null}
            <div className="flex justify-between">
              <dt>Merchandise tax</dt>
              <dd>${quote.merchandiseTaxAmount.toFixed(2)}</dd>
            </div>
            {quote.deliveryRevenue > 0 ? (
              <div className="flex justify-between"><dt>Delivery charged</dt><dd>${quote.deliveryRevenue.toFixed(2)}</dd></div>
            ) : null}
            {quote.deliveryTaxAmount > 0 ? (
              <div className="flex justify-between"><dt>Delivery tax</dt><dd>${quote.deliveryTaxAmount.toFixed(2)}</dd></div>
            ) : null}
            {state.delivery.enabled && state.delivery.feeAllocation === "absorb" ? (
              <div className="flex justify-between text-amber-200"><dt>Delivery absorbed</dt><dd>${quote.vendorDeliveryExpense.toFixed(2)} expense</dd></div>
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

      {state.payment.method === "credit" ? (
        <label className="flex h-14 items-center gap-3 rounded-lg border border-white/10 bg-white/5 px-3 text-lg">
          <input
            type="checkbox"
            checked={state.payment.creditConfirmed}
            onChange={(e) => setCreditConfirmed(e.target.checked)}
            className="h-5 w-5"
          />
          Confirm credit charge
        </label>
      ) : null}

      <ReceiptChoice value={state.payment.receipt} onChange={setReceipt} />

      <button
        type="button"
        onClick={finalize}
        disabled={
          state.ui.processing || isQuoting || !quote || !state.payment.method
        }
        className="h-16 w-full rounded-lg bg-accent text-2xl font-bold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)] transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Complete Sale"
      >
        {state.ui.processing ? "Processing..." : "Complete Sale"}
      </button>
    </div>
  );
}
