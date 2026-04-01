"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { PaymentMethods } from "@/components/quick-pos/payment-methods";
import { ReceiptChoice } from "@/components/quick-pos/receipt-choice";
import { StatusFeedback } from "@/components/quick-pos/status-feedback";
import { useQuickPosStore } from "@/lib/quick-pos/store";
import { canUseCredit } from "@/lib/quick-pos/selectors";
import type { QuickPosCheckoutResponse, QuickPosPaymentMethod } from "@/lib/quick-pos/types";

export default function QuickPosPaymentPage() {
  const router = useRouter();
  const {
    state,
    total,
    setPaymentMethod,
    setReceipt,
    setCreditConfirmed,
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

  const allowCredit = canUseCredit(state);

  const finalize = async () => {
    const method = state.payment.method;

    if (!method) {
      setError("Select payment method");
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
      state.session.pendingIdempotencyKey ?? (crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`);
    if (!state.session.pendingIdempotencyKey) {
      setIdempotencyKey(idempotencyKey);
    }

    try {
      const res = await fetch("/api/pos/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode: "quick",
          idempotencyKey,
          customerId: state.customer.id,
          payment: state.payment,
          items: state.cartItems,
        }),
      });

      const data = (await res.json()) as QuickPosCheckoutResponse;
      if (!res.ok || !data.success || !data.saleId || typeof data.total !== "number") {
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
    } catch {
      setError("Payment failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <StatusFeedback error={state.ui.hardError} success={state.ui.successMessage} />

      <div className="rounded-xl border border-accent/20 bg-gradient-to-br from-accent/10 via-white/5 to-white/0 p-4">
        <p className="text-xs font-semibold uppercase tracking-[0.14em] text-white/60">
          Quick Sale Total
        </p>
        <div className="mt-1 text-3xl font-bold text-white">
          ${total.toFixed(2)}
        </div>
      </div>

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
        disabled={state.ui.processing || !state.payment.method}
        className="h-16 w-full rounded-lg bg-accent text-2xl font-bold text-black shadow-[0_0_0_1px_rgba(255,255,255,0.06)] transition hover:bg-accent/90 disabled:cursor-not-allowed disabled:opacity-50"
        aria-label="Complete Sale"
      >
        {state.ui.processing ? "Processing..." : "Complete Sale"}
      </button>
    </div>
  );
}
