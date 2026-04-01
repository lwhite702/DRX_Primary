"use client";

import type { QuickPosReceiptOption } from "@/lib/quick-pos/types";

const OPTIONS: QuickPosReceiptOption[] = ["print", "sms", "none"];

export function ReceiptChoice({
  value,
  onChange,
}: {
  value: QuickPosReceiptOption;
  onChange: (value: QuickPosReceiptOption) => void;
}) {
  return (
    <section className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 shadow-sm">
      <h2 className="text-lg font-semibold">Receipt</h2>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {OPTIONS.map((option) => (
          <button
            key={option}
            type="button"
            onClick={() => onChange(option)}
            className={
              "h-14 rounded-md border text-lg font-semibold uppercase " +
              (value === option
                ? "border-accent bg-accent text-black"
                : "border-white/10 bg-black/40 text-white hover:border-accent/30")
            }
          >
            {option}
          </button>
        ))}
      </div>
    </section>
  );
}
