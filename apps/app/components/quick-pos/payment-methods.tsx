"use client";

import { useState } from "react";
import type { QuickPosPaymentMethod } from "@/lib/quick-pos/types";

export const P2P_OPTIONS: Array<{ id: QuickPosPaymentMethod; label: string }> = [
  { id: "p2p_cashapp", label: "Cash App" },
  { id: "p2p_paypal", label: "PayPal" },
  { id: "p2p_zelle", label: "Zelle" },
  { id: "p2p_onepay", label: "OnePay" },
  { id: "p2p_chime", label: "Chime" },
  { id: "p2p_venmo", label: "Venmo" },
  { id: "p2p_other", label: "Other" },
];

export function isP2PPaymentMethod(method: QuickPosPaymentMethod | string | null | undefined): boolean {
  return Boolean(method && (method.startsWith("p2p_") || method === "zelle"));
}

export function formatPaymentMethodLabel(method: string | null | undefined): string {
  if (!method) return "Unknown";
  const foundP2P = P2P_OPTIONS.find((opt) => opt.id === method);
  if (foundP2P) return `P2P • ${foundP2P.label}`;
  if (method === "zelle") return "P2P • Zelle";
  if (method === "split" || method === "mixed") return "Split Tender";
  if (method === "card") return "Card";
  if (method === "cash") return "Cash";
  if (method === "credit") return "Store Credit";
  return method.toUpperCase();
}

export function PaymentMethods({
  selected,
  onSelect,
  allowCredit,
}: {
  selected: QuickPosPaymentMethod | null;
  onSelect: (method: QuickPosPaymentMethod) => void;
  allowCredit: boolean;
}) {
  const isP2PSelected = isP2PPaymentMethod(selected);
  const [p2pOpen, setP2pOpen] = useState(isP2PSelected);
  const showP2pSubmenu = p2pOpen || isP2PSelected;

  return (
    <section className="rounded-xl border border-white/10 bg-[#0A0A0A] p-4 shadow-sm space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold">Payment Method</h2>
        {selected && (
          <span className="rounded bg-accent/15 border border-accent/30 px-2.5 py-0.5 text-xs font-semibold text-accent">
            {formatPaymentMethodLabel(selected)}
          </span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-2 md:grid-cols-5">
        <button
          type="button"
          onClick={() => {
            setP2pOpen(false);
            onSelect("cash");
          }}
          className={
            "h-16 rounded-md border text-lg font-semibold uppercase transition " +
            (selected === "cash"
              ? "border-accent bg-accent text-black"
              : "border-white/10 bg-black/40 text-white hover:border-accent/30")
          }
        >
          cash
        </button>

        <button
          type="button"
          onClick={() => {
            setP2pOpen(false);
            onSelect("card");
          }}
          className={
            "h-16 rounded-md border px-2 text-center transition flex flex-col items-center justify-center " +
            (selected === "card"
              ? "border-accent bg-accent text-black"
              : "border-white/10 bg-black/40 text-white hover:border-accent/30")
          }
        >
          <span className="text-lg font-semibold uppercase leading-tight">card</span>
          <span className={"text-[10px] font-medium " + (selected === "card" ? "text-black/80" : "text-white/50")}>
            + Processor Fee
          </span>
        </button>

        <button
          type="button"
          onClick={() => {
            setP2pOpen(true);
            if (!isP2PSelected) {
              onSelect("p2p_cashapp");
            }
          }}
          className={
            "h-16 rounded-md border px-2 text-center transition flex flex-col items-center justify-center " +
            (isP2PSelected
              ? "border-accent bg-accent text-black"
              : "border-white/10 bg-black/40 text-white hover:border-accent/30")
          }
        >
          <span className="text-lg font-semibold uppercase leading-tight">P2P</span>
          <span className={"text-[10px] font-medium " + (isP2PSelected ? "text-black/80" : "text-white/50")}>
            {isP2PSelected
              ? P2P_OPTIONS.find((o) => o.id === selected)?.label ?? "Selected"
              : "CashApp • Zelle +"}
          </span>
        </button>

        {allowCredit && (
          <button
            type="button"
            onClick={() => {
              setP2pOpen(false);
              onSelect("credit");
            }}
            className={
              "h-16 rounded-md border text-lg font-semibold uppercase transition " +
              (selected === "credit"
                ? "border-accent bg-accent text-black"
                : "border-white/10 bg-black/40 text-white hover:border-accent/30")
            }
          >
            credit
          </button>
        )}

        <button
          type="button"
          onClick={() => {
            setP2pOpen(false);
            onSelect("split");
          }}
          className={
            "h-16 rounded-md border px-2 text-center transition flex flex-col items-center justify-center " +
            (selected === "split"
              ? "border-accent bg-accent text-black"
              : "border-white/10 bg-black/40 text-white hover:border-accent/30")
          }
        >
          <span className="text-lg font-semibold uppercase leading-tight">Split</span>
          <span className={"text-[10px] font-medium " + (selected === "split" ? "text-black/80" : "text-white/50")}>
            Multi-Tender
          </span>
        </button>
      </div>

      {showP2pSubmenu && (
        <div
          className="rounded-lg border border-white/15 bg-black/60 p-3 space-y-2"
          role="group"
          aria-label="P2P payment provider"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-white/70">
            Select P2P Platform
          </p>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7">
            {P2P_OPTIONS.map((option) => {
              const active = selected === option.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => onSelect(option.id)}
                  className={
                    "h-11 rounded-md border px-2.5 text-xs font-bold transition " +
                    (active
                      ? "border-accent bg-accent text-black shadow-sm"
                      : "border-white/10 bg-white/5 text-white/90 hover:border-accent/40 hover:bg-accent/10")
                  }
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </section>
  );
}
