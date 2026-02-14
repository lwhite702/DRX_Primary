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
    <section className="rounded-md border border-neutral-800 bg-neutral-950 p-4">
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
                ? "border-white bg-white text-black"
                : "border-neutral-700 bg-black text-white")
            }
          >
            {option}
          </button>
        ))}
      </div>
    </section>
  );
}
