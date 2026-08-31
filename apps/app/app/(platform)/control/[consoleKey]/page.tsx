import { requirePlatformConsole } from "@/lib/auth/platform-console";
import { getPlatformMetrics } from "@/lib/platform/queries";

export default async function PlatformOverview({ params }: { params: Promise<{ consoleKey: string }> }) {
  await requirePlatformConsole((await params).consoleKey);
  const stats = await getPlatformMetrics().catch(() => null);
  const metrics = [
    ["Registered web businesses", stats?.businesses],
    ["Active web businesses", stats?.activeBusinesses],
    ["Business memberships", stats?.memberships],
    ["AI failures · last 24 hours", stats?.aiFailures],
  ] as const;
  return <section className="space-y-6">
    <div><p className="text-sm font-semibold text-red-600">Platform operations</p><h1 className="mt-1 text-3xl font-bold">Platform overview</h1>
      <p className="mt-2 text-muted-foreground">Web registry and service records. These are not merchant sales, profit, or customer metrics.</p></div>
    {!stats && <p role="alert" className="rounded-lg border border-red-600 p-4">Platform metrics are unavailable. Reload to retry; unavailable data is not zero.</p>}
    <dl className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(([label, value]) => <div key={label} className="rounded-xl border border-border bg-card p-5">
      <dt className="text-sm text-muted-foreground">{label}</dt><dd className="mt-3 text-3xl font-bold">{value === undefined ? "Unavailable" : value.toLocaleString()}</dd>
    </div>)}</dl>
    <p className="text-sm text-muted-foreground">Source: transitional web registry. Memberships count business-role assignments, not unique people. Merchant operations remain in the separately authorized business workspace.</p>
  </section>;
}
