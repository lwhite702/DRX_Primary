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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-sm rounded-md border border-neutral-700 bg-black p-5">
        <h2 className="text-2xl font-bold text-white">Exit Quick POS</h2>
        <p className="mt-2 text-sm text-neutral-300">Confirm and enter PIN to leave POS mode.</p>

        <input
          type="password"
          inputMode="numeric"
          placeholder="PIN"
          className="mt-4 h-12 w-full rounded-md border border-neutral-700 bg-neutral-950 px-3 text-xl text-white"
          value={pin}
          onChange={(e) => setPin(e.target.value)}
          autoFocus
        />

        {error ? <p className="mt-2 text-sm font-semibold text-red-400">{error}</p> : null}

        <div className="mt-4 grid grid-cols-2 gap-3">
          <button
            type="button"
            className="h-12 rounded-md border border-neutral-700 bg-neutral-900 text-white"
            onClick={onClose}
            disabled={processing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="h-12 rounded-md bg-white text-black font-semibold disabled:opacity-60"
            onClick={verify}
            disabled={processing || pin.length === 0}
          >
            {processing ? "Checking..." : "Confirm Exit"}
          </button>
        </div>
      </div>
    </div>
  );
}
