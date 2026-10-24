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
import { CreditCard, PlusCircle, Sparkles } from "lucide-react";
import { toast } from "sonner";

interface ExtendCreditModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  currentLimit: number;
  totalCreditUsed: number;
  remainingCredit: number;
  orderTotal?: number;
  onSuccess: (newLimit: number, newRemaining: number) => void;
}

export function ExtendCreditModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  currentLimit,
  totalCreditUsed,
  remainingCredit,
  orderTotal,
  onSuccess,
}: ExtendCreditModalProps) {
  const [submitting, setSubmitting] = useState(false);
  const [targetLimit, setTargetLimit] = useState<string>(
    orderTotal && orderTotal > remainingCredit
      ? Math.max(currentLimit, Math.ceil(totalCreditUsed + orderTotal)).toFixed(2)
      : (currentLimit + 50).toFixed(2)
  );

  const numericTarget = Number(targetLimit);
  const shortage = orderTotal ? Math.max(0, orderTotal - remainingCredit) : 0;

  const handleApply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!Number.isFinite(numericTarget) || numericTarget < 0) {
      toast.error("Please enter a valid positive credit limit");
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/customers/${customerId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          credit_limit: numericTarget,
        }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || "Failed to update credit limit");
      }

      const newRemaining = Math.max(0, numericTarget - totalCreditUsed);
      toast.success(
        `Credit limit extended to $${numericTarget.toFixed(2)}. Available credit is now $${newRemaining.toFixed(2)}.`
      );
      onSuccess(numericTarget, newRemaining);
      onClose();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to extend credit");
    } finally {
      setSubmitting(false);
    }
  };

  const setPreset = (amountToAdd: number) => {
    const next = Math.max(0, currentLimit + amountToAdd);
    setTargetLimit(next.toFixed(2));
  };

  const coverShortage = () => {
    if (!orderTotal) return;
    const requiredLimit = Math.ceil(totalCreditUsed + orderTotal);
    setTargetLimit(requiredLimit.toFixed(2));
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md bg-[#0F0F12] border-white/10 text-white">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-accent" />
            <DialogTitle className="text-lg font-bold tracking-wide">
              Extend Customer Credit
            </DialogTitle>
          </div>
          <DialogDescription className="text-white/60">
            Increase or configure credit line for{" "}
            <span className="font-semibold text-white">{customerName}</span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleApply} className="space-y-4 py-2">
          {/* Current Credit Summary */}
          <div className="grid grid-cols-3 gap-2 rounded-lg border border-white/10 bg-black/40 p-3 text-center">
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/50">Current Limit</p>
              <p className="text-sm font-bold text-white">${currentLimit.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/50">Balance Used</p>
              <p className="text-sm font-bold text-red-400">${totalCreditUsed.toFixed(2)}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-white/50">Available</p>
              <p className="text-sm font-bold text-emerald-300">${remainingCredit.toFixed(2)}</p>
            </div>
          </div>

          {/* Shortage indicator */}
          {shortage > 0 && orderTotal && (
            <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 p-2.5 flex items-center justify-between text-xs">
              <span className="text-amber-200">
                Order total: <strong>${orderTotal.toFixed(2)}</strong> (Short by ${shortage.toFixed(2)})
              </span>
              <Button
                type="button"
                size="sm"
                variant="outline"
                onClick={coverShortage}
                className="h-7 text-[11px] border-amber-500/40 text-amber-300 hover:bg-amber-500/20"
              >
                Cover Order
              </Button>
            </div>
          )}

          {/* Quick preset buttons */}
          <div className="space-y-1.5">
            <Label className="text-xs text-white/70">Quick Increase</Label>
            <div className="grid grid-cols-4 gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreset(25)}
                className="h-8 text-xs border-white/10 hover:border-accent hover:text-accent"
              >
                +$25
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreset(50)}
                className="h-8 text-xs border-white/10 hover:border-accent hover:text-accent"
              >
                +$50
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreset(100)}
                className="h-8 text-xs border-white/10 hover:border-accent hover:text-accent"
              >
                +$100
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setPreset(250)}
                className="h-8 text-xs border-white/10 hover:border-accent hover:text-accent"
              >
                +$250
              </Button>
            </div>
          </div>

          {/* New Limit Input */}
          <div className="space-y-1.5">
            <Label htmlFor="target_credit_limit" className="text-xs text-white/70">
              New Credit Limit ($)
            </Label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-white/50">$</span>
              <Input
                id="target_credit_limit"
                type="number"
                step="0.01"
                min="0"
                value={targetLimit}
                onChange={(e) => setTargetLimit(e.target.value)}
                className="pl-7 h-10 text-base font-bold bg-secondary/30 border-white/10 focus:border-accent"
                required
              />
            </div>
            {Number.isFinite(numericTarget) && numericTarget > 0 && (
              <p className="text-[11px] text-white/50">
                New available credit will be:{" "}
                <strong className="text-emerald-300">
                  ${Math.max(0, numericTarget - totalCreditUsed).toFixed(2)}
                </strong>
              </p>
            )}
          </div>

          <DialogFooter className="pt-2 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={submitting}
              className="text-xs h-9"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting || !Number.isFinite(numericTarget) || numericTarget < 0}
              className="bg-accent text-black hover:bg-accent/90 font-bold text-xs h-9 tracking-wide"
            >
              {submitting ? "Applying..." : "Confirm & Extend Credit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
