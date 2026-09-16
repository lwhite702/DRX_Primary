"use client";

import { useEffect } from "react";

export default function PosSaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("POS sale route error:", error);
  }, [error]);

  return (
    <div className="rounded-2xl border border-destructive/30 bg-destructive/10 p-6 text-center space-y-4 max-w-lg mx-auto my-8">
      <div className="w-10 h-10 rounded-full bg-destructive/20 text-destructive mx-auto flex items-center justify-center font-bold">
        !
      </div>
      <div>
        <h2 className="text-lg font-semibold text-destructive-foreground">POS Register Error</h2>
        <p className="text-sm text-muted-foreground mt-1">
          The point of sale is unavailable right now. Retry the operation or reload the register.
        </p>
      </div>
      <div className="flex justify-center gap-3 pt-2">
        <button
          type="button"
          onClick={() => reset()}
          className="px-4 py-2 rounded-lg bg-accent text-black font-semibold text-sm hover:bg-accent/90 transition-colors"
        >
          Retry Register
        </button>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="px-4 py-2 rounded-lg border border-border bg-card text-foreground font-semibold text-sm hover:bg-muted transition-colors"
        >
          Reload Page
        </button>
      </div>
    </div>
  );
}
