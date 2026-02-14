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
      <div className="rounded-md border border-emerald-700 bg-emerald-950 px-6 py-5 text-center">
        <p className="text-4xl font-bold text-emerald-200">Sale Complete</p>
      </div>
    </div>
  );
}
