"use client";

import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Layers, Calendar, DollarSign, Package, AlertTriangle, CheckCircle2 } from "lucide-react";
import { type Inventory } from "@/lib/validations/schemas";
import { formatCurrency } from "@/lib/utils";

interface InventoryBatch {
  _id: string;
  businessId: string;
  productId: string;
  intakeId?: string;
  originalQuantityGrams: number;
  remainingQuantityGrams: number;
  unitCostPerGramCents: number;
  receivedAt: number;
  expirationDate?: number;
  supplier?: string;
  createdAt: number;
}

interface FifoBatchesDrawerProps {
  product: Inventory | null;
  isOpen: boolean;
  onClose: () => void;
}

export function FifoBatchesDrawer({
  product,
  isOpen,
  onClose,
}: FifoBatchesDrawerProps) {
  const [batches, setBatches] = useState<InventoryBatch[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen || !product?.id) {
      setBatches([]);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`/api/inventory/batches?productId=${encodeURIComponent(product.id)}`, {
      cache: "no-store",
    })
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load inventory batches");
        return res.json();
      })
      .then((data) => {
        if (!cancelled) {
          // Sort FIFO: receivedAt ascending
          const sorted = Array.isArray(data.batches)
            ? [...data.batches].sort((a, b) => a.receivedAt - b.receivedAt)
            : [];
          setBatches(sorted);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Error loading batches");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [isOpen, product?.id]);

  const unit = product?.commerce_config?.sellingUnit || product?.unit_of_measure || "g";
  const now = Date.now();

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-md bg-[#121214] border-white/10 text-white p-0 flex flex-col"
      >
        <SheetHeader className="p-6 border-b border-white/10 space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/10 text-blue-400">
              <Layers className="h-5 w-5" />
            </div>
            <div>
              <SheetTitle className="text-lg font-bold text-white">
                FIFO Batch Inventory
              </SheetTitle>
              <SheetDescription className="text-xs text-zinc-400">
                Track First-In, First-Out intake allocations and depleted quantities.
              </SheetDescription>
            </div>
          </div>

          {product && (
            <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs">
              <div>
                <p className="font-semibold text-white text-sm">{product.product_name}</p>
                <p className="font-mono text-zinc-400">SKU: {product.sku}</p>
              </div>
              <div className="text-right">
                <p className="text-zinc-400">Total On Hand</p>
                <p className="font-mono font-bold text-emerald-400 text-sm">
                  {product.quantity_on_hand} {unit}
                </p>
              </div>
            </div>
          )}
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {loading ? (
            <div className="space-y-3 py-6" aria-label="Loading batches" aria-busy="true">
              {[0, 1, 2].map((i) => (
                <div key={i} className="h-28 rounded-xl bg-white/5 animate-pulse" />
              ))}
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl border border-red-500/20 bg-red-500/10 text-red-400 text-xs">
              {error}
            </div>
          ) : batches.length === 0 ? (
            <div className="py-12 text-center text-zinc-400 space-y-2">
              <Package className="h-10 w-10 mx-auto text-zinc-600 mb-2" />
              <p className="text-sm font-medium text-zinc-300">No FIFO batches recorded</p>
              <p className="text-xs text-zinc-500 max-w-xs mx-auto">
                Batches are automatically tracked when inventory is approved through the intake pipeline.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <p className="text-[11px] font-semibold text-zinc-400 uppercase tracking-wider">
                {batches.length} {batches.length === 1 ? "Batch" : "Batches"} in Queue (FIFO Order)
              </p>

              {batches.map((batch, index) => {
                const isDepleted = batch.remainingQuantityGrams <= 0;
                const isExpiringSoon =
                  batch.expirationDate &&
                  batch.expirationDate - now <= 30 * 86_400_000 &&
                  batch.expirationDate > now;
                const isExpired = batch.expirationDate && batch.expirationDate <= now;
                const percentRemaining =
                  batch.originalQuantityGrams > 0
                    ? Math.max(
                        0,
                        Math.min(
                          100,
                          (batch.remainingQuantityGrams / batch.originalQuantityGrams) * 100
                        )
                      )
                    : 0;

                return (
                  <div
                    key={batch._id}
                    className={`p-4 rounded-xl border transition-all ${
                      isDepleted
                        ? "bg-white/[0.02] border-white/5 opacity-60"
                        : "bg-[#18181B] border-white/10 hover:border-white/20"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-blue-500/15 text-blue-300 border border-blue-500/20">
                          #{index + 1}
                        </span>
                        <span className="text-xs text-zinc-300 font-mono">
                          {batch._id.slice(-8)}
                        </span>
                      </div>

                      {isDepleted ? (
                        <Badge variant="outline" className="text-[10px] border-zinc-700 text-zinc-500">
                          Depleted
                        </Badge>
                      ) : isExpired ? (
                        <Badge variant="destructive" className="text-[10px] flex items-center gap-1">
                          <AlertTriangle className="h-3 w-3" /> Expired
                        </Badge>
                      ) : isExpiringSoon ? (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-amber-500/15 text-amber-300 border border-amber-500/30 flex items-center gap-1"
                        >
                          <AlertTriangle className="h-3 w-3" /> Expiring Soon
                        </Badge>
                      ) : (
                        <Badge
                          variant="secondary"
                          className="text-[10px] bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 flex items-center gap-1"
                        >
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </Badge>
                      )}
                    </div>

                    <div className="space-y-2 mt-3 text-xs">
                      <div className="flex justify-between items-center text-zinc-400">
                        <span>Quantity Remaining:</span>
                        <span className="font-mono font-bold text-white">
                          {batch.remainingQuantityGrams} / {batch.originalQuantityGrams} {unit}
                        </span>
                      </div>

                      {/* Progress bar */}
                      <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all ${
                            isDepleted
                              ? "bg-zinc-600"
                              : percentRemaining < 25
                                ? "bg-amber-400"
                                : "bg-emerald-500"
                          }`}
                          style={{ width: `${percentRemaining}%` }}
                        />
                      </div>

                      <div className="pt-2 grid grid-cols-2 gap-2 text-[11px] text-zinc-400">
                        <div className="flex items-center gap-1">
                          <DollarSign className="h-3.5 w-3.5 text-zinc-500" />
                          <span>Cost: {formatCurrency(batch.unitCostPerGramCents / 100)}/{unit}</span>
                        </div>
                        <div className="flex items-center gap-1 justify-end">
                          <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                          <span>Rec: {new Date(batch.receivedAt).toLocaleDateString()}</span>
                        </div>
                      </div>

                      {batch.expirationDate && (
                        <div className="text-[11px] text-zinc-400 flex justify-between pt-1 border-t border-white/5">
                          <span>Expires:</span>
                          <span
                            className={
                              isExpired
                                ? "text-red-400 font-semibold"
                                : isExpiringSoon
                                  ? "text-amber-400 font-semibold"
                                  : "text-zinc-300"
                            }
                          >
                            {new Date(batch.expirationDate).toLocaleDateString()}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
