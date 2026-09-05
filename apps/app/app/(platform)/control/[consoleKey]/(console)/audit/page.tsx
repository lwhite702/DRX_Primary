import { requirePlatformConsole } from "@/lib/auth/platform-console";
import { getPlatformAudit } from "@/lib/platform/queries";

export default async function Page({ params }: { params: Promise<{ consoleKey: string }> }) {
  await requirePlatformConsole((await params).consoleKey);
  const logs = await getPlatformAudit().catch(() => null);
  return <section className="space-y-5"><h1 className="text-3xl font-bold">Platform audit</h1>
    <p className="text-muted-foreground">Latest 100 platform-scope events. Business audit records stay in the business workspace; sensitive payloads are excluded.</p>
    {logs === null ? <p role="alert">Audit records are unavailable. Reload to retry.</p> : logs.length === 0 ? <p>No platform events recorded.</p> :
      <ul className="divide-y rounded-xl border">{logs.map((log) => <li key={log.id} className="flex flex-wrap justify-between gap-2 p-4"><span>{log.action} · {log.entityType}</span><time dateTime={log.createdAt.toISOString()} className="text-sm text-muted-foreground">{log.createdAt.toISOString()}</time></li>)}</ul>}
  </section>;
}
