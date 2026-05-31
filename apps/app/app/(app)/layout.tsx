import { AppShell } from "@/components/layout/app-shell";
import { AppProviders } from "@/components/providers";

export const revalidate = 3600; // Enable ISR caching for the shell

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppProviders>
      <AppShell>{children}</AppShell>
    </AppProviders>
  );
}
