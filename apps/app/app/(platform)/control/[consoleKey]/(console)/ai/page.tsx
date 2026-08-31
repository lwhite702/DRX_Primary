import { requirePlatformConsole } from "@/lib/auth/platform-console";
import { getPlatformAiFailures } from "@/lib/platform/queries";

export default async function Page({ params }: { params: Promise<{ consoleKey: string }> }) {
  await requirePlatformConsole((await params).consoleKey);
  const failures = await getPlatformAiFailures().catch(() => null);
  return <section className="space-y-5"><h1 className="text-3xl font-bold">AI operations</h1>
    <p className="text-muted-foreground">Latest 100 failure events from web service records. Customer content, generated insights, provider messages, and stack traces are excluded.</p>
    {failures === null ? <p role="alert">AI operations are unavailable. Reload to retry.</p> : failures.length === 0 ? <p>No failure events recorded.</p> :
      <ul className="divide-y rounded-xl border">{failures.map((failure) => <li key={failure.id} className="flex flex-wrap justify-between gap-2 p-4"><span>{failure.functionName}</span><time dateTime={failure.createdAt.toISOString()} className="text-sm text-muted-foreground">{failure.createdAt.toISOString()}</time></li>)}</ul>}
  </section>;
}
