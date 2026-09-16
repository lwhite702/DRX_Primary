"use client";
import React, { useEffect, useState } from "react";
import { formatCount } from "@/lib/number-format";
import { useAuth } from "@/lib/adapters/auth/ui";
import { useBusiness } from "@/lib/hooks/use-business";
import { usePrivacyContext } from "@/lib/privacy/use-privacy-context";
import { maskAlias, shouldMaskFromProtocol } from "@/lib/privacy/masking";
import { EmptyState } from "@/components/ui/empty-state";
import { FileText, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { AppPageSkeleton } from "@/components/skeletons/app-page-skeleton";
import { PageHeader } from "@/components/ui/page-header";
import { CreditHeader } from "./_components/CreditHeader";
import { CreditStats } from "./_components/CreditStats";
import { CreditCustomerList } from "./_components/CreditCustomerList";
import { CreditTransactionsList } from "./_components/CreditTransactionsList";
import { ExtensionDialog } from "./_components/ExtensionDialog";
import { PaymentDialog } from "./_components/PaymentDialog";
import { useCreditManager } from "./_hooks/useCreditManager";
import { Tour } from "@/components/ui/tour";

export default function CreditPage() {
  const { userId } = useAuth();
  return <CreditPageContent key={userId ?? "signed-out"} />;
}
function CreditPageContent() {
  const { userId } = useAuth();
  const { business, loading: businessLoading } = useBusiness();
  const manager = useCreditManager(business?.id);
  const privacy = usePrivacyContext(Boolean(business));
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>();
  const [historyCustomerId, setHistoryCustomerId] = useState<string>();
  useEffect(() => { setSearchTerm(""); setSelectedCustomerId(undefined); setHistoryCustomerId(undefined); }, [business?.id, userId]);
  if (businessLoading || (manager.loading && !manager.accounts.length)) return <AppPageSkeleton rows={5} />;
  if (!business) return <EmptyState icon={FileText} title="Finish business setup" description="Complete onboarding before managing credit." className="m-4 md:m-8" />;
  if (!privacy.protocol) return <section className="m-4 rounded-lg border p-6" aria-live="polite"><p>{privacy.error ?? "Loading customer privacy settings…"}</p>{privacy.error && <Button variant="outline" onClick={privacy.retry}>Retry privacy settings</Button>}</section>;
  const masked = shouldMaskFromProtocol(privacy.protocol, privacy.manualEnabled, false);
  const accounts = manager.accounts.map(account => ({ ...account, displayName: masked ? maskAlias(account.displayName) : account.displayName }));
  const filtered = accounts.filter(account => account.displayName.toLowerCase().includes(searchTerm.toLowerCase()));
  const transactions = manager.transactions.filter(tx => !historyCustomerId || tx.customerId === historyCustomerId).map(tx => ({ ...tx, customerLabel: masked ? maskAlias(tx.customerLabel) : tx.customerLabel }));
  const pending = manager.pendingCount > 0 || manager.hasMorePending;
  const busy = manager.mutating || manager.refreshing;
  const openPayment = (id?: string) => { setSelectedCustomerId(id); manager.setShowPaymentDialog(true); };
  return <div className="space-y-6 p-4 md:p-8 page-transition">
    <PageHeader title="Payments" description="Track balances, extensions, and recorded payments."><div id="tour-credit-extension"><CreditHeader searchTerm={searchTerm} onSearchChange={setSearchTerm} onOpenPayment={() => openPayment()} onOpenExtension={() => { setSelectedCustomerId(undefined); manager.setShowExtensionDialog(true); }} disabled={busy || pending} /></div></PageHeader>
    <div className="flex flex-wrap items-center justify-between gap-3"><p role="status" aria-live="polite" className="text-sm text-muted-foreground">{manager.refreshing ? "Refreshing credit balances…" : manager.error ? manager.error : "Balances reflect the latest completed refresh."}</p><Button variant="outline" disabled={busy} onClick={() => void manager.refreshData()}><RefreshCw aria-hidden="true" className={`mr-2 h-4 w-4 ${manager.refreshing ? "animate-spin" : ""}`} />Refresh</Button></div>
    {pending && <section aria-label="Pending credit requests" className="space-y-3 rounded-lg border p-4"><p role="status">{manager.hasMorePending ? "More than " : ""}{formatCount(manager.pendingCount)} pending {manager.pendingCount === 1 && !manager.hasMorePending ? "request" : "requests"} on this device. These are not confirmed balances.</p><p className="text-sm text-muted-foreground">Retry sync before entering another extension or payment.</p><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void manager.syncPending()}>Retry pending sync</Button><Button variant="outline" disabled={busy} onClick={() => void manager.resolvePending()}>Check status and cancel unrecorded requests</Button></div><p className="text-xs text-muted-foreground">Recorded transactions are kept. Requests that were not recorded will stop after their status is checked.</p></section>}
    <div id="tour-credit-stats"><CreditStats accounts={accounts} agingByCustomer={manager.agingByCustomer} accountsComplete={manager.accountsComplete} unavailable={Boolean(manager.error && !accounts.length)} /></div>
    <section id="tour-credit-list" className="space-y-4"><h2 className="text-lg font-semibold">Accounts Overview</h2><CreditCustomerList accounts={filtered} agingByCustomer={manager.agingByCustomer} busy={busy || pending} onRecordPayment={openPayment} onViewHistory={id => { setHistoryCustomerId(id); document.getElementById("credit-history")?.scrollIntoView({ behavior: "smooth" }); }} onRefreshAllocation={id => void manager.refreshAllocation(id)} />
      {manager.hasMoreAccounts && <Button variant="outline" disabled={busy} onClick={() => void manager.loadMoreAccounts()}>Load more accounts</Button>}
    </section>
    <section id="credit-history" className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">Recent Activity{historyCustomerId ? ` · ${accounts.find(account => account.customerId === historyCustomerId)?.displayName ?? "Selected account"}` : ""}</h2>{historyCustomerId && <Button variant="outline" onClick={() => setHistoryCustomerId(undefined)}>Show all history</Button>}</div><p className="text-xs text-muted-foreground">Latest loaded transactions. Opening balances marked unreconciled require review.</p><CreditTransactionsList transactions={transactions} /></section>
    <ExtensionDialog key={`${business.id}-${userId}-extension`} open={manager.showExtensionDialog} onOpenChange={manager.setShowExtensionDialog} accounts={accounts} selectedCustomerId={selectedCustomerId} onSubmit={manager.handleExtension} disabled={pending} />
    <PaymentDialog key={`${business.id}-${userId}-payment`} open={manager.showPaymentDialog} onOpenChange={manager.setShowPaymentDialog} accounts={accounts} selectedCustomerId={selectedCustomerId} onSubmit={manager.handlePayment} disabled={pending} />
    <Tour tourId="credit_v1" onComplete={() => {}} steps={[
      { targetId: "tour-credit-stats", title: "Balances and aging", description: "Review outstanding balances and every overdue bucket. Pending aging stays visible until calculated." },
      { targetId: "tour-credit-list", title: "Account actions", description: "Record a payment for an account or filter its history." },
      { targetId: "tour-credit-extension", title: "Extensions and payments", description: "Requests remain pending on this device until confirmed. Retry an existing request before creating another." },
    ]} />
  </div>;
}
