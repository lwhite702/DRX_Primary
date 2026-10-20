import { MarketingRouteMotion } from "@/components/marketing/route-motion";

export default function MarketingTemplate({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return <MarketingRouteMotion>{children}</MarketingRouteMotion>;
}
