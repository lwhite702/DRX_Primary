import { BusinessProvider } from "@/lib/hooks/use-business";

export default function OperatorLayout({ children }: { children: React.ReactNode }) {
  return <BusinessProvider>{children}</BusinessProvider>;
}
