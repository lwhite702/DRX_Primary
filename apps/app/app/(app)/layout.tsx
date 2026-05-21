import { AppShell } from "@/components/layout/app-shell";
import { AppProviders } from "@/components/providers";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <AppShell>{children}</AppShell>
    </AppProviders>
  );
}
