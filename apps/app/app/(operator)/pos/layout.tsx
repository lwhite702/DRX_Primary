"use client";

import dynamic from "next/dynamic";
import { SalesSkeleton } from "@/components/skeletons/sales-skeleton";

const PosLayoutShell = dynamic(
  () =>
    import("@/components/quick-pos/pos-layout-shell").then(
      (mod) => mod.PosLayoutShell,
    ),
  {
    ssr: false,
    loading: () => <SalesSkeleton />,
  },
);

export default function QuickPosLayout({ children }: { children: React.ReactNode }) {
  return <PosLayoutShell>{children}</PosLayoutShell>;
}
