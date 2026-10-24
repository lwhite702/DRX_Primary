"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DollarSign } from "lucide-react";
import { toast } from "sonner";

interface RecordCreditPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  currentBalance: number;
  onSuccess: () => void;
}

export function RecordCreditPaymentModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  currentBalance,
  onSuccess,
}: RecordCreditPaymentModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [amount, setAmount] = useState<string>(
    currentBalance > 0 ? currentBalance.toFixed(2) : ""
  );
  const [method, setMethod] = useState<"cash" | "check" | "transfer" | "other">("cash");
  const [notes, setNotes] = useState("");

  const numericAmount = Number(amount);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const cents = Math.round(numericAmount * 100);
    if (!Number.isSafeInteger(cents) || cents <= 0) {
      toast.error("Please enter a valid positive payment amount");
      return;
    }
    const maxCents = Math.round(currentBalance * 100);
    if (cents > maxCents) {
      toast.error(`Payment cannot exceed the outstanding balance of $${currentBalance.toFixed(2)}`);
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch("/api/credit/transactions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customer_id: customerId,
          transaction_type: "payment",
          amount: numericAmount,
          payment_method: method,
          description: notes.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to record payment");
      }

      toast.success(`Payment of $${numericAmount.toFixed(2)} recorded successfully`);
      onSuccess();
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to record payment");
    } finally {
      setSubmitting(false);
    }
  };

  const handlePayFull = () => {
    setAmount(currentBalance.toFixed(2));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-[#0F0F12] border-white/10 text-white">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400">
              <DollarSign className="h-5 w-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold">Record Credit Payment</DialogTitle>
              <DialogDescription className="text-zinc-400 text-xs">
                Record a payment against {customerName}&apos;s outstanding store credit.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          <div className="p-3 rounded-lg bg-white/5 border border-white/10 flex justify-between items-center">
            <span className="text-xs text-zinc-400">Outstanding Balance:</span>
            <div className="flex items-center gap-2">
              <span className="text-base font-bold font-mono text-amber-400">
                ${currentBalance.toFixed(2)}
              </span>
              {currentBalance > 0 && (
                <button
                  type="button"
                  onClick={handlePayFull}
                  className="text-xs text-emerald-400 hover:underline"
                >
                  Pay Full
                </button>
              )}
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-amount" className="text-xs text-zinc-300">
              Payment Amount ($)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">$</span>
              <Input
                id="payment-amount"
                type="number"
                step="0.01"
                min="0.01"
                max={currentBalance > 0 ? currentBalance : undefined}
                required
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="0.00"
                className="pl-7 bg-white/5 border-white/10 text-white font-mono"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-method" className="text-xs text-zinc-300">
              Payment Method
            </Label>
            <select
              id="payment-method"
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full h-10 px-3 rounded-md bg-[#161616] border border-white/10 text-white text-sm focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="cash">Cash</option>
              <option value="check">Check</option>
              <option value="transfer">Bank / Digital Transfer</option>
              <option value="other">Other</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="payment-notes" className="text-xs text-zinc-300">
              Notes / Reference (Optional)
            </Label>
            <Input
              id="payment-notes"
              type="text"
              value={notes}
              maxLength={200}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. Received by cashier, check #1234"
              className="bg-white/5 border-white/10 text-white"
            />
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={onClose}
              disabled={submitting}
              className="text-zinc-400 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || numericAmount <= 0}
              className="bg-emerald-600 hover:bg-emerald-500 text-white"
            >
              {submitting ? "Recording…" : "Confirm Payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
