"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  ShieldCheck,
  Truck,
  CreditCard,
  Lock,
  Smartphone,
  User,
  AlertTriangle,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ReviewItem {
  id: string;
  name: string;
  quantity: number;
  unit: string;
  price: number;
  weightGrams?: number;
  weightConversion?: string;
}

interface ReviewMetadata {
  transactionId: string;
  timestamp: string;
  device: string;
  operator: string;
}

interface CustomerInfo {
  name: string;
  id?: string;
  maskedId?: string;
}

interface POSReviewModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: () => void;
  items: ReviewItem[];
  subtotal: number;
  tax: number;
  total: number;
  customer?: CustomerInfo;
  paymentMethod?: string;
  metadata?: ReviewMetadata;
  isProcessing?: boolean;
}

export function POSReviewModal({
  open,
  onOpenChange,
  onConfirm,
  items,
  subtotal,
  tax,
  total,
  customer,
  paymentMethod = "Cash Payment", // Default for now
  metadata,
  isProcessing,
}: POSReviewModalProps) {
  // Mock metadata if not provided (for dev preview)
  const meta = metadata || {
    transactionId: `TXN-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`,
    timestamp: new Date().toLocaleString(),
    device: "Mobile • iOS 18",
    operator: "Owner Account",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[800px] bg-background border-border p-0 gap-0 overflow-hidden sm:rounded-xl">
        {/* Header - Neon Green Bar */}
        <div className="bg-[#ccff00]/10 border-b border-[#ccff00]/20 p-6 flex items-start gap-4">
          <div className="p-2 bg-[#ccff00]/20 rounded-full text-[#ccff00]">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-[#ccff00] tracking-tight">
              Review Before Finalizing
            </h2>
            <p className="text-[#ccff00]/70 text-sm mt-1">
              This action is{" "}
              <span className="font-bold underline">irreversible</span>. Verify
              all line items, quantities, conversions, payment method, and
              customer association before proceeding.
            </p>
          </div>
        </div>

        <ScrollArea className="max-h-[60vh] overflow-y-auto">
          <div className="p-6 space-y-8">
            {/* Line Items */}
            <div className="space-y-4">
              <div className="flex justify-between text-xs text-muted-foreground uppercase tracking-wider font-mono">
                <span>Line Items</span>
                <span>{items.length} products</span>
              </div>
              <div className="space-y-3">
                {items.map((item) => (
                  <div
                    key={item.id}
                    className="p-4 rounded-lg bg-secondary/30 border border-border flex justify-between items-start"
                  >
                    <div>
                      <p className="font-bold text-base">{item.name}</p>
                      <p className="text-sm text-muted-foreground mt-1 font-mono">
                        Qty: {item.quantity}
                        {item.unit}
                      </p>
                      {item.weightConversion && (
                        <div className="mt-2 text-xs font-mono text-muted-foreground bg-background/50 p-1.5 rounded inline-block border border-border/50">
                          {item.weightConversion}
                        </div>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-lg">
                        ${item.price.toFixed(2)}
                      </p>
                      {item.quantity > 1 && (
                        <p className="text-xs text-muted-foreground">
                          ${(item.price / item.quantity).toFixed(2)}/{item.unit}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Financial Summary */}
            <div className="space-y-4">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
                Financial Summary
              </p>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Subtotal</span>
                  <span className="font-mono font-medium">
                    ${subtotal.toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tax</span>
                  <span className="font-mono font-medium">
                    ${tax.toFixed(2)}
                  </span>
                </div>
              </div>
              <div className="flex justify-between items-end pt-2">
                <span className="text-lg font-bold">Total Due</span>
                <span className="text-4xl font-bold text-[#ccff00] font-mono tracking-tight">
                  ${total.toFixed(2)}
                </span>
              </div>
            </div>

            <Separator className="bg-border/50" />

            {/* Payment & Customer */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Payment Method */}
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
                  Payment Method
                </p>
                <div className="p-4 rounded-lg bg-secondary/30 border border-border flex items-center gap-3">
                  <div className="p-2 bg-[#ccff00]/10 rounded-full text-[#ccff00]">
                    <CreditCard className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-bold text-sm">{paymentMethod}</p>
                    <p className="text-xs text-muted-foreground">
                      Immediate settlement • No credit extended
                    </p>
                  </div>
                </div>
              </div>

              {/* Customer Association */}
              <div className="space-y-3">
                <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono">
                  Customer Association
                </p>
                <div className="p-4 rounded-lg bg-secondary/30 border border-border space-y-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-purple-500/10 rounded-full text-purple-400">
                      <User className="w-5 h-5" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">
                        {customer ? customer.name : "Anonymous Sale"}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {customer
                          ? "Customer linked to sale"
                          : "No customer linked • Details hidden"}
                      </p>
                    </div>
                  </div>
                  {!customer && (
                    <div className="flex items-center gap-2 p-2 bg-red-500/10 border border-red-500/20 rounded text-xs text-red-400">
                      <Lock className="w-3 h-3" />
                      <span className="font-bold">DETAILS HIDDEN:</span>
                      <span className="text-red-400/80">
                        Customer PII masked.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Metadata (Footer-like) */}
            <div className="pt-2">
              <p className="text-xs text-muted-foreground uppercase tracking-wider font-mono mb-3">
                Transaction Metadata
              </p>
              <div className="grid grid-cols-2 gap-y-4 gap-x-8 text-xs font-mono text-muted-foreground">
                <div>
                  <p className="opacity-50 mb-1">TRANSACTION ID</p>
                  <p className="text-foreground">{meta.transactionId}</p>
                </div>
                <div>
                  <p className="opacity-50 mb-1">TIMESTAMP</p>
                  <p className="text-foreground">{meta.timestamp}</p>
                </div>
                <div>
                  <p className="opacity-50 mb-1">DEVICE</p>
                  <p className="text-foreground">{meta.device}</p>
                </div>
                <div>
                  <p className="opacity-50 mb-1">OPERATOR</p>
                  <p className="text-foreground">{meta.operator}</p>
                </div>
              </div>
            </div>

            {/* Warning Banner */}
            <div className="flex gap-3 p-4 bg-red-950/30 border border-red-900/50 rounded-lg">
              <div className="p-1 bg-red-500/20 rounded text-red-500 h-fit">
                <AlertTriangle className="w-4 h-4" />
              </div>
              <div className="text-xs text-red-200/80 leading-relaxed">
                <strong className="text-red-400 block mb-1">
                  Irreversible Action
                </strong>
                Once finalized, this transaction cannot be undone. Inventory
                will be adjusted, payment will be recorded, and audit trail will
                be permanent. Verify all details before proceeding.
              </div>
            </div>
          </div>
        </ScrollArea>

        {/* Footer Actions */}
        <div className="p-6 bg-background border-t border-border flex flex-col gap-3">
          <Button
            className="w-full h-14 text-lg font-bold bg-[#ccff00] text-black hover:bg-[#ccff00]/90 shadow-[0_0_20px_rgba(204,255,0,0.3)] transition-all"
            onClick={onConfirm}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin w-5 h-5 border-2 border-black border-t-transparent rounded-full" />
                PROCESSING...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Lock className="w-5 h-5" />
                FINALIZE SALE
              </div>
            )}
          </Button>
          <Button
            variant="ghost"
            className="w-full text-muted-foreground hover:text-foreground h-12 uppercase tracking-wide text-xs font-bold"
            onClick={() => onOpenChange(false)}
            disabled={isProcessing}
          >
            Cancel & Return to Cart
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
