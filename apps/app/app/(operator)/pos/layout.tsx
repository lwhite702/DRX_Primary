import dynamic from "next/dynamic";

const PosLayoutShell = dynamic(
  () =>
    import("@/components/quick-pos/pos-layout-shell").then(
      (mod) => mod.PosLayoutShell,
    ),
  {
    ssr: false,
    loading: () => (
      <div className="min-h-screen w-full animate-pulse bg-background" />
    ),
  },
);

export default function QuickPosLayout({ children }: { children: React.ReactNode }) {
  return <PosLayoutShell>{children}</PosLayoutShell>;
}
