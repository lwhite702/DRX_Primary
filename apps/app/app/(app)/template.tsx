import { AppRouteMotion } from "@/components/ui/route-motion";

export default function AppTemplate({ children }: { children: React.ReactNode }) {
  return <AppRouteMotion>{children}</AppRouteMotion>;
}
