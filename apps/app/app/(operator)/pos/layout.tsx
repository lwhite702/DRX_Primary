"use client";

import { PosLayoutShell } from "@/components/quick-pos/pos-layout-shell";

export default function QuickPosLayout({ children }: { children: React.ReactNode }) {
  return <PosLayoutShell>{children}</PosLayoutShell>;
}
