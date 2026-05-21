"use client";

import { useState } from "react";

export function ExitPosDialog({
  open,
  onClose,
  onSuccess,
}: {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}) {
  const bypassMode = process.env.NEXT_PUBLIC_BYPASS_AUTH_FOR_TESTING === "true";
  const [pin, setPin] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  if (!open) return null;

  const verify = async () => {
    setProcessing(true);
    setError(null);

    try {
      const res = await fetch("/api/pos/exit/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });

      const data = (await res.json()) as { allowed?: boolean };
      if (!data.allowed) {
        setError("Invalid PIN");
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
            : "Confirm and enter PIN to leave Quick Sale mode."}
        </p>
        {!bypassMode ? (
          <p className="mt-1 text-xs text-white/60">
            PIN is managed in Settings {"->"} POS Controls.
          </p>
        ) : null}

        {bypassMode ? (
          <div className="mt-3 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-100">
            Local bypass mode: exit verification is disabled.
          </div>
        ) : null}

        {bypassMode ? null : (
          <input
            type="password"
            inputMode="numeric"
            placeholder="PIN"
            className="mt-4 h-12 w-full rounded-md border border-white/10 bg-black/50 px-3 text-xl text-white placeholder:text-muted-foreground"
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            autoFocus
          />
        )}

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
            onClick={bypassMode ? onSuccess : verify}
            disabled={processing || (!bypassMode && pin.length === 0)}
          >
            {processing ? "Checking..." : bypassMode ? "Exit Now" : "Confirm Exit"}
          </button>
        </div>
      </div>
    </div>
  );
}
