"use client";

import { useEffect, useState } from "react";
import { useIsBypassActive } from "@/lib/adapters/auth/ui";

export function ExitPosDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const bypassMode = useIsBypassActive();
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);
  const [hasPinConfigured, setHasPinConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    if (!open || bypassMode) return;
    let active = true;
    fetch("/api/pos/exit/verify")
      .then((res) => res.json())
      .then((data: { hasPinConfigured?: boolean }) => {
        if (active && typeof data.hasPinConfigured === "boolean") {
          setHasPinConfigured(data.hasPinConfigured);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, [open, bypassMode]);

  if (!open) return null;

  const requiresPin = !bypassMode && hasPinConfigured !== false;

  const verify = async () => {
    if (!requiresPin) {
      onSuccess();
      return;
    }

    setProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/pos/exit/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = (await res.json()) as { allowed?: boolean; error?: string };
      if (!data.allowed) {
        setError(
          res.status === 401
            ? "Your session expired. Sign in again to continue."
            : data.error || "Enter the configured manager PIN and try again.",
        );
        return;
      }

      onSuccess();
    } catch {
      setError("Exit verification failed");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="w-full max-w-sm rounded-xl border border-white/10 bg-[#0A0A0A] p-5 shadow-2xl">
        <h2 className="text-2xl font-bold text-white">Exit Quick Sale</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          {bypassMode
            ? "Bypass mode is active. You can exit without a PIN."
            : hasPinConfigured === false
              ? "No manager PIN is configured for this workspace. You can exit to your workspace anytime."
              : "Enter the manager PIN to return to your workspace."}
        </p>

        {bypassMode ? (
          <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Local bypass mode: exit verification is disabled.
          </div>
        ) : hasPinConfigured === false ? (
          <div className="mt-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 px-3 py-2 text-xs text-emerald-100">
            No PIN required. Exit enabled. You can set up a Manager PIN later in Settings → POS Controls.
          </div>
        ) : (
          <p className="mt-1 text-xs text-white/60">
            PIN is managed in Settings → POS Controls.
          </p>
        )}

        {requiresPin ? (
          <input
            type="password"
            inputMode="numeric"
            placeholder="PIN"
            className="mt-4 h-12 w-full rounded-md border border-white/10 bg-black/50 px-3 text-xl text-white placeholder:text-muted-foreground"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
          />
        ) : null}

        {error ? <p className="mt-2 text-sm font-semibold text-red-400">{error}</p> : null}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="h-12 rounded-md border border-white/10 bg-white/5 text-white"
            onClick={onClose}
            disabled={processing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="h-12 rounded-md bg-accent text-black font-semibold disabled:opacity-60"
            onClick={verify}
            disabled={processing}
          >
            {processing ? "Checking..." : requiresPin ? "Confirm Exit" : "Exit to Workspace"}
          </button>
        </div>
      </div>
    </div>
  );
}
