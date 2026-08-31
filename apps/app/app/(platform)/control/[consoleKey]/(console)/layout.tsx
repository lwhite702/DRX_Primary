import type { Metadata } from "next";
import { requirePlatformConsole } from "@/lib/auth/platform-console";
import { PlatformShell } from "@/components/platform/platform-shell";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "DRX · Platform administration",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PlatformLayout({ children, params }: {
  children: React.ReactNode;
  params: Promise<{ consoleKey: string }>;
}) {
  const { consoleKey } = await params;
  await requirePlatformConsole(consoleKey);
  return <PlatformShell basePath={`/control/${consoleKey}`}>{children}</PlatformShell>;
}
