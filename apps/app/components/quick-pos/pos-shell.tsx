"use client";

import { useRouter } from "next/navigation";
import { ExitPosDialog } from "@/components/quick-pos/exit-pos-dialog";
import { useQuickPosStore } from "@/lib/quick-pos/store";

export function PosShell({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const { state, setExitOpen } = useQuickPosStore();

  return (
    <div className="min-h-screen bg-black text-white">
      <header className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
        <h1 className="text-3xl font-bold tracking-tight">Quick POS</h1>
        <button
          type="button"
          className="h-12 rounded-md border border-neutral-700 px-4 text-lg font-semibold"
          onClick={() => setExitOpen(true)}
        >
          Exit Quick POS
        </button>
      </header>

      <main className="p-4">{children}</main>

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
