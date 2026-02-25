"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useQuickPosStore } from "@/lib/quick-pos/store";

export default function QuickPosCompletePage() {
  const router = useRouter();
  const { state, resetForNextSale } = useQuickPosStore();

  useEffect(() => {
    if (!state.session.lastSaleId || !state.session.lastCompletedAt) {
      router.replace("/pos/sale");
      return;
    }

    const timer = window.setTimeout(() => {
      resetForNextSale();
      router.replace("/pos/sale");
    }, 300);

    return () => window.clearTimeout(timer);
  }, [router, resetForNextSale, state.session.lastCompletedAt, state.session.lastSaleId]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="w-full max-w-xl rounded-2xl border border-emerald-400/30 bg-gradient-to-br from-emerald-500/15 via-black to-black px-6 py-6 text-center shadow-2xl">
        <div className="mx-auto mb-3 inline-flex items-center rounded-full border border-emerald-300/30 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-emerald-200">
          Quick Sale
        </div>
        <p className="text-4xl font-bold text-emerald-200">Sale Complete</p>
        <p className="mt-2 text-sm text-emerald-100/80">
          Returning to the register to ring up the next customer.
        </p>
        <div className="mt-4 space-y-1 rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm text-emerald-100">
          <p>Sale ID: {state.session.lastSaleId}</p>
          {typeof state.session.lastSaleTotal === "number" ? (
            <p>Total: ${state.session.lastSaleTotal.toFixed(2)}</p>
          ) : null}
          {state.session.lastReceipt ? (
            <p className="uppercase tracking-wide text-emerald-200/90">
              Receipt: {state.session.lastReceipt}
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}
