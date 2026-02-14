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
    <section className="rounded-md border border-neutral-800 bg-neutral-950 p-4">
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
                ? "border-white bg-white text-black"
                : "border-neutral-700 bg-black text-white")
            }
          >
            {method}
          </button>
        ))}
      </div>
    </section>
  );
}
