import { MarketHeader } from "@/components/marketing/market-header";

export default function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <MarketHeader />
      <div className="flex-1">{children}</div>
    </div>
  );
}
