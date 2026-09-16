"use client";

import { useRouter } from "next/navigation";
import { ExitPosDialog } from "@/components/quick-pos/exit-pos-dialog";
import { useQuickPosStore } from "@/lib/quick-pos/store";
import { useIsBypassActive } from "@/lib/adapters/auth/ui";

export function PosShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { state, setExitOpen } = useQuickPosStore();
  const bypassMode = useIsBypassActive();

  return (
    <div className="min-h-screen bg-[#070809] text-white">
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#070809]/95 backdrop-blur supports-[backdrop-filter]:bg-[#070809]/80">
        <div className="mx-auto flex max-w-[1600px] items-center justify-between gap-4 px-4 py-3 md:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-3">
              <div className="inline-flex items-center rounded-md border border-accent/25 bg-accent/10 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-accent">
                DRX
              </div>
              <div className="inline-flex items-center rounded-md border border-white/10 bg-white/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-white/80">
                New sale
              </div>
            </div>
            <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-xl font-bold tracking-tight md:text-2xl">
                Register
              </h1>
              <p className="text-xs text-white/60 md:text-sm">
                {bypassMode
                  ? "PIN bypass is on. You can leave New sale without a PIN."
                  : "Use the manager PIN when one is configured in Settings > POS Controls."}
              </p>
            </div>
          </div>

          <button
            type="button"
            className="h-11 shrink-0 rounded-md border border-accent/30 bg-accent/10 px-4 text-sm font-semibold text-accent hover:bg-accent/15 md:text-base"
            onClick={() => setExitOpen(true)}
          >
            Exit New sale
          </button>
        </div>
        <div className="mx-auto max-w-[1600px] px-4 pb-3 md:px-6">
          <div className="h-px w-full bg-gradient-to-r from-accent/35 via-white/10 to-transparent" />
        </div>
      </header>

      <main className="mx-auto w-full max-w-[1600px] p-4 md:p-6">
        {children}
      </main>

      <ExitPosDialog
        open={state.ui.exitDialogOpen}
        onClose={() => setExitOpen(false)}
        onSuccess={() => {
          setExitOpen(false);
          router.replace("/dashboard");
        }}
      />
    </div>
  );
}
