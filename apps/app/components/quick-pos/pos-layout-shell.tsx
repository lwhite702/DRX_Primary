"use client";

import { QuickPosProvider } from "@/lib/quick-pos/store";
import { PosShell } from "@/components/quick-pos/pos-shell";

export function PosLayoutShell({ children }: { children: React.ReactNode }) {
  return (
    <QuickPosProvider>
      <PosShell>{children}</PosShell>
    </QuickPosProvider>
  );
}
