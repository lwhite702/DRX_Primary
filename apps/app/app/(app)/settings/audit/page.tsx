"use client";
import { useEffect, useState } from "react";
import { useBusiness } from "@/lib/hooks/use-business";

type AuditItem = { id: string; action: string; entityType: string; createdAt: string };
export default function BusinessAuditPage() {
  const { business } = useBusiness();
  const [result, setResult] = useState<{ businessId: string; items: AuditItem[] } | null>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const controller = new AbortController();
    setResult(null); setError(false);
    if (!business?.id) return;
    const businessId = business.id;
    fetch(`/api/admin/audit-logs?business_id=${encodeURIComponent(businessId)}`, {
      headers: { "x-business-id": businessId }, cache: "no-store", signal: controller.signal,
    }).then(async response => {
      if (!response.ok) throw new Error("Audit unavailable");
      const body = await response.json();
      if (!controller.signal.aborted) setResult({ businessId, items: body.items });
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [business?.id]);
  const items = result?.businessId === business?.id ? result?.items : null;
  return <section className="space-y-5 p-4 md:p-8"><h1 className="text-3xl font-bold">Business audit</h1>
    <p className="text-muted-foreground">Activity for the selected business only. Platform administration is separate.</p>
    {error ? <p role="alert">Audit records unavailable or access denied. Reload to retry.</p> : !items ? <p role="status">Loading business audit…</p> : items.length === 0 ? <p>No business audit records.</p> :
      <ul className="divide-y rounded-xl border">{items.map(item => <li key={item.id} className="flex flex-wrap justify-between gap-2 p-4"><span>{item.action} · {item.entityType}</span><time dateTime={item.createdAt}>{new Date(item.createdAt).toLocaleString()}</time></li>)}</ul>}
  </section>;
}
