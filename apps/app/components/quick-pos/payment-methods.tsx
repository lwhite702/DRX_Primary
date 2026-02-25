"use client";

import type { QuickPosPaymentMethod } from "@/lib/quick-pos/types";

const METHODS: QuickPosPaymentMethod[] = ["cash", "card", "credit"];

export function PaymentMethods({
  selected,
  onSelect,
  allowCredit,
}: {
  selected: QuickPosPaymentMethod | null;
  onSelect: (method: QuickPosPaymentMethod) => void;
  allowCredit: boolean;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Payment Method</h2>
      <div className="mt-3 grid grid-cols-1 gap-2 md:grid-cols-3">
        {METHODS.filter((method) => (method === "credit" ? allowCredit : true)).map((method) => (
          <button
            key={method}
            type="button"
            onClick={() => onSelect(method)}
            className={
              "h-16 rounded-md border text-xl font-semibold uppercase " +
              (selected === method
                ? "border-accent bg-accent text-black"
                : "border-white/10 bg-black/40 text-white hover:border-accent/30")
            }
          >
            {method}
          </button>
        ))}
      </div>
    </section>
  );
}
