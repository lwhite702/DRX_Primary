import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { formatCount } from "@/lib/number-format";
import { useAuth } from "@/lib/adapters/auth/ui";
import { aggregateCreditAging, fetchCreditAccountsPage, refreshCreditAllocation, type CreditAccount, type CreditAgingResult } from "@/lib/credit/dashboard-client";
import { CreditPendingQueue, syncCreditRequests, resolveCreditRequests, type CreditQueueScope, type CreditRequestInput } from "@/lib/credit/pending-queue";

const transactionSchema = z.object({ id: z.string().min(1), customerId: z.string().min(1), amountCents: z.number().int().positive().max(Number.MAX_SAFE_INTEGER).or(z.literal(0)), transactionType: z.enum(["extension", "payment", "purchase", "opening"]), createdAt: z.string().datetime(), status: z.enum(["completed", "unreconciled"]), dueDate: z.string().datetime().optional(), paymentMethod: z.string().max(100).optional() });
export type CreditDashboardTransaction = z.infer<typeof transactionSchema> & { customerLabel: string };
type State = { key: string; asOfDate?: number; accounts: CreditAccount[]; agingByCustomer: Record<string, CreditAgingResult>; transactions: CreditDashboardTransaction[]; loading: boolean; refreshing: boolean; mutating: boolean; error: string | null; accountsComplete: boolean; cursor?: string; pendingCount: number; hasMorePending: boolean; showExtensionDialog: boolean; showPaymentDialog: boolean };
const empty = (key: string): State => ({ key, accounts: [], agingByCustomer: {}, transactions: [], loading: true, refreshing: false, mutating: false, error: null, accountsComplete: false, pendingCount: 0, hasMorePending: false, showExtensionDialog: false, showPaymentDialog: false });
function amountCents(amount: number) {
  const cents = Math.round(amount * 100);
  if (typeof amount !== "number" || !Number.isFinite(amount) || !Number.isSafeInteger(cents) || cents <= 0 || Math.abs(amount * 100 - cents) > 1e-6) throw new Error("Enter a positive amount with at most two decimal places.");
  return cents;
}

export function useCreditManager(businessId: string | undefined) {
  const { userId } = useAuth();
  const deployment = process.env.NEXT_PUBLIC_CONVEX_URL ?? "";
  const key = JSON.stringify([deployment, userId, businessId]);
  const context = useMemo(() => ({ key, scope: { deployment, operatorId: userId ?? "", businessId: businessId ?? "" } as CreditQueueScope, mounted: true, readVersion: 0, pendingVersion: 0, reading: false, writing: false, controllers: new Set<AbortController>() }), [key, deployment, userId, businessId]);
  const current = useRef(context); current.current = context;
  const queue = useRef<CreditPendingQueue | null>(null);
  if (!queue.current) queue.current = new CreditPendingQueue();
  const [state, setState] = useState(() => empty(key));
  const stateRef = useRef(state); stateRef.current = state;
  const active = useCallback(() => current.current === context && context.mounted, [context]);
  const patch = useCallback((value: Partial<State>) => {
    if (active()) setState(previous => ({ ...(previous.key === key ? previous : empty(key)), ...value }));
  }, [active, key]);
  const scopedFetch = useCallback<typeof fetch>(async (input, init) => {
    if (!active()) throw new Error("Credit context changed");
    const url = new URL(String(input), window.location.origin);
    url.searchParams.set("expectedUserId", context.scope.operatorId);
    const headers = new Headers(init?.headers); headers.set("X-Business-Id", context.scope.businessId);
    let body = init?.body;
    if (typeof body === "string") body = JSON.stringify({ ...JSON.parse(body), expectedUserId: context.scope.operatorId });
    return fetch(url.pathname + url.search, { ...init, headers, body });
  }, [active, context]);
  const pending = useCallback(async () => {
    const version = ++context.pendingVersion;
    const result = await queue.current!.pending(context.scope);
    if (version === context.pendingVersion) patch({ pendingCount: result.entries.length, hasMorePending: result.hasMore });
    return result;
  }, [context, patch]);

  const read = useCallback(async (more = false) => {
    if (!context.scope.businessId || !context.scope.operatorId) { patch({ ...empty(key), loading: false }); return; }
    if (more && context.reading) return;
    const previous = stateRef.current.key === key ? stateRef.current : empty(key);
    if (more && (previous.accountsComplete || !previous.cursor)) return;
    const version = ++context.readVersion;
    if (!more) for (const controller of context.controllers) controller.abort();
    const controller = new AbortController(); context.controllers.add(controller); context.reading = true;
    patch({ loading: previous.accounts.length === 0, refreshing: previous.accounts.length > 0, error: null });
    const valid = () => active() && context.readVersion === version;
    try {
      const page = await fetchCreditAccountsPage({ businessId: context.scope.businessId, cursor: more ? previous.cursor : undefined, limit: 25, signal: controller.signal }, scopedFetch);
      if (!valid()) return;
      const accounts = more ? [...previous.accounts, ...page.page] : page.page;
      if (new Set(accounts.map(account => account.customerId)).size !== accounts.length) throw new Error("Accounts changed. Refresh the dashboard.");
      const asOfDate = more && previous.asOfDate !== undefined ? previous.asOfDate : Math.floor(Date.now() / 86400000) * 86400000;
      const agingByCustomer: Record<string, CreditAgingResult> = more ? { ...previous.agingByCustomer } : {};
      const results = await Promise.allSettled(page.page.map(async account => {
        const result = await aggregateCreditAging({ businessId: context.scope.businessId, customerId: account.customerId, asOfDate, maxPages: 100, signal: controller.signal }, scopedFetch);
        if (result.balanceCents !== account.balanceCents) throw new Error("Credit balances changed. Refresh the dashboard.");
        return { customerId: account.customerId, result };
      }));
      let agingFailed = false;
      for (const result of results) {
        if (result.status === "fulfilled") agingByCustomer[result.value.customerId] = result.value.result;
        else agingFailed = true;
      }
      let transactions = previous.transactions;
      if (!more) {
        const params = new URLSearchParams({ business_id: context.scope.businessId, limit: "50" });
        const response = await scopedFetch(`/api/credit/transactions?${params}`, { signal: controller.signal, cache: "no-store" });
        if (!response.ok) throw new Error("Credit transactions could not be refreshed.");
        transactions = z.array(transactionSchema).max(50).parse(await response.json()).map(row => ({ ...row, customerLabel: `Account ${row.customerId.slice(-8)}` }));
      }
      if (valid()) patch({ accounts, agingByCustomer, transactions, asOfDate, accountsComplete: page.isDone, cursor: page.isDone ? undefined : page.continueCursor, error: agingFailed ? "Some aging details are unavailable. Balances are shown without incomplete aging totals." : null });
    } catch {
      if (valid()) patch({ error: "Credit data could not be refreshed. Previously loaded values may be outdated." });
    } finally {
      context.controllers.delete(controller);
      if (valid()) { context.reading = false; patch({ loading: false, refreshing: false }); }
    }
  }, [active, context, key, patch, scopedFetch]);
  const refreshData = useCallback(() => read(false), [read]);
  const loadMoreAccounts = useCallback(() => read(true), [read]);
  const syncPending = useCallback(async () => {
    if (context.writing || !active() || !context.scope.operatorId || !context.scope.businessId) return;
    context.writing = true; patch({ mutating: true });
    let confirmed = false;
    try {
      if (!navigator.onLine) { await pending(); toast.info("Pending requests remain saved on this device. Reconnect to confirm them."); return; }
      const result = await syncCreditRequests(queue.current!, context.scope, active);
      confirmed = result.confirmed > 0;
      if (!active()) return;
      if (confirmed) toast.success("Pending credit requests confirmed.");
      await pending();
      if (confirmed) await refreshData();
    } catch {
      if (active() && confirmed) { patch({ error: "Credit requests were confirmed, but local pending status could not refresh." }); toast.info("Credit requests confirmed. Refresh pending status before another request."); }
      else if (active()) { patch({ error: "Credit requests remain pending. Retry sync before entering another request." }); toast.error("Credit requests remain pending. Retry sync to confirm their status."); try { await pending(); } catch { patch({ error: "Pending credit storage is unavailable. Do not replace an uncertain request." }); } }
    } finally { if (active()) { context.writing = false; patch({ mutating: false }); } }
  }, [active, context, patch, pending, refreshData]);

  const resolvePending = useCallback(async () => {
    if (context.writing || !active() || !context.scope.operatorId || !context.scope.businessId) return;
    context.writing = true; patch({ mutating: true });
    let resolved = false;
    try {
      if (!navigator.onLine) throw new Error("Reconnect to check pending credit requests.");
      const result = await resolveCreditRequests(queue.current!, context.scope, active);
      resolved = true;
      if (!active()) return;
      toast.success(`${formatCount(result.confirmed)} recorded request(s) confirmed; ${formatCount(result.cancelled)} unrecorded request(s) cancelled.`);
      await pending();
      await refreshData();
    } catch {
      if (active()) {
        const message = resolved
          ? "Request statuses were resolved, but local pending status could not refresh. Refresh before another request."
          : "Some request statuses could not be resolved. Check pending requests again before entering another request.";
        patch({ error: message });
        if (resolved) toast.info(message); else toast.error(message);
        if (!resolved) try { await pending(); } catch { /* Preserve pending state until storage is readable. */ }
      }
    } finally { if (active()) { context.writing = false; patch({ mutating: false }); } }
  }, [active, context, patch, pending, refreshData]);

  const submit = useCallback(async (input: CreditRequestInput) => {
    if (context.writing || !active()) return;
    context.writing = true; patch({ mutating: true });
    let persisted = false;
    let confirmed = false;
    try {
      const existing = await pending();
      if (!active()) return;
      if (existing.entries.length || existing.hasMore) throw new Error("Sync the pending request before entering another credit request.");
      await queue.current!.create(context.scope, input); persisted = true;
      if (!active()) return;
      await pending();
      patch({ showExtensionDialog: false, showPaymentDialog: false });
      if (!navigator.onLine) { toast.info("Credit request saved on this device. It is pending confirmation when you reconnect."); return; }
      const result = await syncCreditRequests(queue.current!, context.scope, active);
      confirmed = result.confirmed > 0;
      if (!active()) return;
      if (confirmed) toast.success(input.kind === "issue" ? "Credit extension confirmed." : "Credit payment confirmed.");
      await pending();
      if (confirmed) await refreshData();
    } catch (error) {
      if (active()) {
        const message = confirmed ? "Credit request was confirmed, but local pending status could not refresh. Refresh before another request." : persisted ? "Credit request is saved but not confirmed. Retry sync before entering another request." : error instanceof Error ? error.message : "Credit request could not be saved.";
        patch({ error: message });
        if (confirmed) toast.info(message); else toast.error(message);
      }
    } finally { if (active()) { context.writing = false; patch({ mutating: false }); } }
  }, [active, context, patch, pending, refreshData]);
  const handleExtension = useCallback(async (data: { customer_id: string; amount: number; notes?: string; due_date?: string }) => {
    try { await submit({ customerId: data.customer_id, kind: "issue", amountCents: amountCents(data.amount), description: data.notes || undefined, dueDate: data.due_date || undefined }); }
    catch (error) { if (active()) toast.error(error instanceof Error ? error.message : "Invalid credit request."); }
  }, [active, submit]);
  const handlePayment = useCallback(async (data: { customer_id: string; amount: number; notes?: string; payment_method?: string }) => {
    try {
      if (data.payment_method !== undefined && !["cash", "check", "transfer", "other"].includes(data.payment_method)) throw new Error("Invalid payment method.");
      await submit({ customerId: data.customer_id, kind: "payment", amountCents: amountCents(data.amount), description: data.notes || undefined, paymentMethod: data.payment_method as CreditRequestInput["paymentMethod"] });
    } catch (error) { if (active()) toast.error(error instanceof Error ? error.message : "Invalid credit request."); }
  }, [active, submit]);
  const refreshAllocation = useCallback(async (customerId: string) => {
    const controller = new AbortController(); context.controllers.add(controller);
    try {
      await refreshCreditAllocation({ businessId: context.scope.businessId, customerId, signal: controller.signal }, scopedFetch);
      if (active()) { toast.info("Aging refresh scheduled. Refresh the dashboard to check progress."); await refreshData(); }
    } catch { if (active()) patch({ error: "Aging refresh could not be scheduled. Try again." }); }
    finally { context.controllers.delete(controller); }
  }, [active, context, patch, refreshData, scopedFetch]);
  useEffect(() => {
    context.mounted = true;
    void refreshData();
    if (context.scope.operatorId && context.scope.businessId) void pending().catch(() => patch({ error: "Pending credit storage is unavailable. New requests cannot be safely submitted." }));
    const online = () => { void syncPending(); };
    window.addEventListener("online", online);
    return () => { context.mounted = false; for (const controller of context.controllers) controller.abort(); window.removeEventListener("online", online); };
  }, [context, patch, pending, refreshData, syncPending]);
  const visible = state.key === key ? state : empty(key);
  return { ...visible, hasMoreAccounts: !visible.accountsComplete && Boolean(visible.cursor), refreshData, loadMoreAccounts, refreshAllocation, syncPending, resolvePending, handleExtension, handlePayment, setShowExtensionDialog: (open: boolean) => patch({ showExtensionDialog: open }), setShowPaymentDialog: (open: boolean) => patch({ showPaymentDialog: open }) };
}
