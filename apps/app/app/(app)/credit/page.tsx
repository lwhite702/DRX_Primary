"use client";
import React, { useEffect, useState } from "react";
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
  const masked = privacy.protocol ? shouldMaskFromProtocol(privacy.protocol, privacy.manualEnabled, false) : false;
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>();
  const [historyCustomerId, setHistoryCustomerId] = useState<string>();
  useEffect(() => { setSearchTerm(""); setSelectedCustomerId(undefined); setHistoryCustomerId(undefined); }, [business?.id, userId]);
  useEffect(() => {
    const timer = window.setTimeout(() => { void manager.searchAccounts(searchTerm, masked); }, searchTerm.trim() ? 250 : 0);
    return () => window.clearTimeout(timer);
  }, [manager.searchAccounts, masked, searchTerm]);
  if (businessLoading || (manager.loading && !manager.accounts.length)) return <AppPageSkeleton rows={5} />;
  if (!business) return <EmptyState icon={FileText} title="Finish business setup" description="Complete onboarding before managing credit." className="m-4 md:m-8" />;
  if (!privacy.protocol) return <section className="m-4 rounded-lg border p-6" aria-live="polite"><p>{privacy.error ?? "Loading customer privacy settings…"}</p>{privacy.error && <Button variant="outline" onClick={privacy.retry}>Retry privacy settings</Button>}</section>;
  const accounts = manager.accounts.map(account => ({ ...account, displayName: masked ? maskAlias(account.displayName) : account.displayName }));
  const searchMatches = (manager.searchQuery === searchTerm.trim() ? manager.searchResults : []).map(account => ({ ...account, displayName: masked ? maskAlias(account.displayName) : account.displayName }));
  const filtered = searchTerm.trim() ? searchMatches : accounts;
  const aging = searchTerm.trim() ? manager.searchAging : manager.agingByCustomer;
  const transactions = (historyCustomerId ? manager.historyTransactions : manager.transactions).map(tx => ({ ...tx, customerLabel: masked ? maskAlias(tx.customerLabel) : tx.customerLabel }));
  const pending = manager.pendingCount > 0 || manager.hasMorePending;
  const count = (value: number) => new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
  const busy = manager.mutating || manager.refreshing;
  const openPayment = (id?: string) => { setSelectedCustomerId(id); manager.setShowPaymentDialog(true); };
  return <div className="space-y-6 p-4 md:p-8 page-transition">
    <PageHeader title="Payments" description="See who owes a balance, how much, and how long it has been due."><div id="tour-credit-extension"><CreditHeader searchTerm={searchTerm} onSearchChange={setSearchTerm} onOpenPayment={() => openPayment()} onOpenExtension={() => { setSelectedCustomerId(undefined); manager.setShowExtensionDialog(true); }} disabled={busy || pending} /></div></PageHeader>
    <div className="flex flex-wrap items-center justify-between gap-3"><p role="status" aria-live="polite" className="text-sm text-muted-foreground">{manager.refreshing ? "Refreshing balances…" : manager.error ?? "Balances reflect the latest completed refresh."}</p><Button variant="outline" disabled={busy} onClick={() => void manager.refreshData()}><RefreshCw aria-hidden="true" className={`mr-2 h-4 w-4 ${manager.refreshing ? "animate-spin" : ""}`} />Refresh balances</Button></div>
    {pending && <section aria-label="Changes waiting for confirmation" className="space-y-3 rounded-lg border p-4"><p role="status">{manager.hasMorePending ? "More than " : ""}{count(manager.pendingCount)} {manager.pendingCount === 1 && !manager.hasMorePending ? "change is" : "changes are"} saved on this device but not yet confirmed.</p><p className="text-sm text-muted-foreground">Check these changes before recording another payment or adding to a balance.</p><div className="flex flex-wrap gap-2"><Button disabled={busy} onClick={() => void manager.syncPending()}>Try sending again</Button><Button variant="outline" disabled={busy} onClick={() => void manager.resolvePending()}>Check which changes were saved</Button></div><p className="text-xs text-muted-foreground">Confirmed changes stay recorded. Changes that were not saved are cleared after their status is checked.</p></section>}
    <div id="tour-credit-stats"><CreditStats accounts={accounts} agingByCustomer={manager.agingByCustomer} accountsComplete={manager.accountsComplete} unavailable={Boolean(manager.error && !accounts.length)} /></div>
    <section id="tour-credit-list" className="space-y-4"><div className="flex flex-wrap items-end justify-between gap-2"><div><h2 className="text-lg font-semibold">Customer balances</h2><p className="text-sm text-muted-foreground">Amounts due, due dates, and the next steps for each customer.</p></div>{searchTerm.trim() && !manager.searchLoading && <p className="text-sm text-muted-foreground">{count(filtered.length)} matching {filtered.length === 1 ? "customer" : "customers"}</p>}</div>
      <CreditCustomerList accounts={filtered} agingByCustomer={aging} busy={busy || pending} searching={manager.searchLoading || (Boolean(searchTerm.trim()) && manager.searchQuery !== searchTerm.trim())} searchError={manager.searchQuery === searchTerm.trim() ? manager.searchError : null} searchTerm={searchTerm} onRetrySearch={() => void manager.searchAccounts(searchTerm, masked)} onRecordPayment={openPayment} onAddBalance={id => { setSelectedCustomerId(id); manager.setShowExtensionDialog(true); }} onViewHistory={id => { const account = filtered.find(row => row.customerId === id); if (account) void manager.loadCustomerHistory(id, account.displayName); setHistoryCustomerId(id); document.getElementById("credit-history")?.scrollIntoView({ behavior: "smooth" }); }} onRefreshAllocation={id => void manager.refreshAllocation(id)} />
      {!searchTerm.trim() && manager.hasMoreAccounts && <Button variant="outline" disabled={busy} onClick={() => void manager.loadMoreAccounts()}>Load more customers</Button>}
    </section>
    <section id="credit-history" className="space-y-4"><div className="flex flex-wrap items-center justify-between gap-3"><h2 className="text-lg font-semibold">{historyCustomerId ? `Payment history · ${manager.historyCustomerLabel ? masked ? maskAlias(manager.historyCustomerLabel) : manager.historyCustomerLabel : "Customer"}` : "Recent payments and balance changes"}</h2>{historyCustomerId && <Button variant="outline" onClick={() => { setHistoryCustomerId(undefined); manager.clearCustomerHistory(); }}>Show recent activity</Button>}</div>{historyCustomerId && manager.historyLoading ? <p role="status" className="text-sm text-muted-foreground">Loading this customer's payment history…</p> : historyCustomerId && manager.historyError ? <div className="space-y-2"><p role="alert" className="text-sm text-destructive">{manager.historyError}</p><Button variant="outline" onClick={() => void manager.loadCustomerHistory(historyCustomerId, manager.historyCustomerLabel ?? "Customer")}>Try again</Button></div> : <CreditTransactionsList transactions={transactions} />}</section>
    <ExtensionDialog key={`${business.id}-${userId}-extension`} open={manager.showExtensionDialog} onOpenChange={manager.setShowExtensionDialog} accounts={searchTerm.trim() ? searchMatches : accounts} selectedCustomerId={selectedCustomerId} onSubmit={manager.handleExtension} disabled={pending} />
    <PaymentDialog key={`${business.id}-${userId}-payment`} open={manager.showPaymentDialog} onOpenChange={manager.setShowPaymentDialog} accounts={searchTerm.trim() ? searchMatches : accounts} selectedCustomerId={selectedCustomerId} onSubmit={manager.handlePayment} disabled={pending} />
    <Tour tourId="credit_v1" onComplete={() => {}} steps={[
      { targetId: "tour-credit-stats", title: "Balance summary", description: "Totals stay marked as incomplete until all customer balances have been checked." },
      { targetId: "tour-credit-list", title: "Customer balances", description: "Search every customer by name or alias, review how long amounts have been due, and choose an account action." },
      { targetId: "tour-credit-extension", title: "Payments and new balances", description: "Record a payment received or add a new amount to a customer's balance with an optional due date." },
    ]} />
  </div>;
}
