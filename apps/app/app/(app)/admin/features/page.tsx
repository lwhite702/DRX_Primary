import { FLAG_MANIFEST } from "@/lib/posthog/flags-manifest";

export const revalidate = 60;

export default function FeatureFlagsPage() {
  return (
    <main className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">PostHog rollout flags</h1>
        <p className="mt-2 text-muted-foreground">
          Read-only manifest status. Change targeting and cohorts in PostHog; it is the sole runtime authority.
        </p>
      </div>
      <div className="overflow-hidden rounded-xl border bg-card">
        <table className="w-full text-left text-sm">
          <thead className="border-b bg-muted/50">
            <tr><th className="p-3">Key</th><th className="p-3">Owner</th><th className="p-3">Default</th><th className="p-3">Stage</th></tr>
          </thead>
          <tbody>
            {FLAG_MANIFEST.map((flag) => (
              <tr className="border-b last:border-0" key={flag.key}>
                <td className="p-3 font-mono text-xs">{flag.key}</td>
                <td className="p-3">{flag.owner}</td>
                <td className="p-3">{flag.defaultEnabled ? "On" : "Off"}</td>
                <td className="p-3">{flag.rolloutState}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
