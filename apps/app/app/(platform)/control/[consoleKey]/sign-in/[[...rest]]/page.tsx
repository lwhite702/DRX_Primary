import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { auth } from "@/lib/adapters/auth/server";
import { SignIn } from "@/lib/adapters/auth/ui";
import { drxClerkAuthAppearance } from "@/lib/adapters/auth/appearance";
import { requirePlatformConsole, requirePlatformEntryKey } from "@/lib/auth/platform-console";

export const dynamic = "force-dynamic";
export const metadata: Metadata = {
  title: "Platform sign in | Deelrx CRM",
  robots: { index: false, follow: false },
  referrer: "no-referrer",
};

export default async function PlatformSignInPage({ params }: {
  params: Promise<{ consoleKey: string; rest?: string[] }>;
}) {
  const { consoleKey } = await params;
  requirePlatformEntryKey(consoleKey);
  const basePath = `/control/${consoleKey}`;
  if ((await auth()).userId) {
    await requirePlatformConsole(consoleKey);
    redirect(basePath);
  }
  return (
    <div className="flex min-h-dvh flex-col bg-[#121212] text-white">
      <header className="shrink-0 border-b border-red-950 bg-red-700 px-4 py-3 text-white" aria-label="Platform administration warning">
        <p className="font-bold tracking-wide">PLATFORM ADMINISTRATION</p>
        <p className="text-sm">Restricted platform access. Business ownership does not grant access.</p>
      </header>
      <main className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-6 py-12">
        <h1 className="mb-3 text-2xl font-bold">Platform administrator sign in</h1>
        <p className="mb-8 text-sm text-neutral-300">Use your approved platform account. Platform access is checked after sign-in.</p>
        <SignIn routing="path" path={`${basePath}/sign-in`} forceRedirectUrl={basePath} fallbackRedirectUrl={basePath}
          appearance={{ ...drxClerkAuthAppearance, elements: { ...drxClerkAuthAppearance.elements, footerAction: "hidden" } }} />
      </main>
    </div>
  );
}
