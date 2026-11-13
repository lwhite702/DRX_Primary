import React from "react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import type { CreditAccount, CreditAgingResult } from "../../lib/credit/dashboard-client";
const mocks = vi.hoisted(() => ({ manager: {} as Record<string, unknown>, userId: "operator", privacy: { protocol: { screen_privacy: { mode: "manual" } }, manualEnabled: false, error: null as string | null, retry: vi.fn() } }));
vi.mock("@/lib/hooks/use-business", () => ({ useBusiness: () => ({ business: { id: "tenant" }, loading: false }) }));
vi.mock("@/lib/adapters/auth/ui", () => ({ useAuth: () => ({ userId: mocks.userId }) }));
vi.mock("@/lib/privacy/use-privacy-context", () => ({ usePrivacyContext: () => mocks.privacy }));
vi.mock("@/app/(app)/credit/_hooks/useCreditManager", () => ({ useCreditManager: () => mocks.manager }));
vi.mock("next/navigation", () => ({ useRouter: () => ({ push: vi.fn(), back: vi.fn() }) }));
vi.mock("@/components/ui/tour", () => ({ Tour: () => null }));
import CreditPage from "../../app/(app)/credit/page";
import { CreditStats } from "../../app/(app)/credit/_components/CreditStats";
import { CreditCustomerCard } from "../../app/(app)/credit/_components/CreditCustomerCard";
import { ExtensionDialog } from "../../app/(app)/credit/_components/ExtensionDialog";
import { PaymentDialog } from "../../app/(app)/credit/_components/PaymentDialog";
const account: CreditAccount = { customerId: "account-a", displayName: "Account alpha", isActive: true, creditEnabled: true, limitCents: 1000, unlimited: false, balanceCents: 700, allocationStatus: "ready" };
const ready = (buckets = {}): CreditAgingResult => ({ status: "ready", asOfDate: Date.UTC(2026, 8, 6), balanceCents: 700, bucketsCents: { current: 0, "1_7": 100, "8_14": 200, "15_30": 300, "31_plus": 100, undated: 0, unreconciled: 0, ...buckets }, entryCount: 4, pagesRead: 1 });
beforeEach(() => {
  mocks.userId = "operator"; mocks.privacy.protocol = { screen_privacy: { mode: "manual" } }; mocks.privacy.manualEnabled = false;
  mocks.manager = { accounts: [account, { ...account, customerId: "account-b", displayName: "Account beta" }], agingByCustomer: { "account-a": ready(), "account-b": ready() }, transactions: [{ id: "tx-a", customerId: "account-a", customerLabel: "Account alpha", amountCents: 100, transactionType: "payment", createdAt: "2026-09-06T00:00:00.000Z", status: "completed" }, { id: "tx-b", customerId: "account-b", customerLabel: "Account beta", amountCents: 200, transactionType: "opening", createdAt: "2026-09-06T00:00:00.000Z", status: "unreconciled" }], searchResults: [], searchAging: {}, searchLoading: false, searchError: null, searchAccounts: vi.fn(), historyTransactions: [], historyLoading: false, historyError: null, historyCustomerLabel: undefined, loadCustomerHistory: vi.fn(), clearCustomerHistory: vi.fn(), loading: false, refreshing: false, mutating: false, error: null, accountsComplete: false, hasMoreAccounts: true, pendingCount: 0, hasMorePending: false, showExtensionDialog: false, showPaymentDialog: false, setShowExtensionDialog: vi.fn(), setShowPaymentDialog: vi.fn(), refreshData: vi.fn(), loadMoreAccounts: vi.fn(), refreshAllocation: vi.fn(), syncPending: vi.fn(), resolvePending: vi.fn(), handleExtension: vi.fn(), handlePayment: vi.fn() };
  Element.prototype.scrollIntoView = vi.fn();
});
afterEach(cleanup);
it("labels loaded totals, includes every overdue range and formats counts and money", () => {
  render(<CreditStats accounts={[account]} agingByCustomer={{ "account-a": ready() }} accountsComplete={false} />);
  expect(screen.getByText(/Customers loaded: 1\./)).toBeTruthy();
  expect(screen.getAllByText("$7.00")).toHaveLength(2);
  expect(screen.getByText(/70.0%/)).toBeTruthy();
});
it("matches the dashboard active-balance definition and reports inactive debt separately", () => {
  const inactive = { ...account, customerId: "inactive-account", displayName: "Inactive account", isActive: false, balanceCents: 500 };
  render(<CreditStats accounts={[account, inactive]} agingByCustomer={{ "account-a": ready(), "inactive-account": ready() }} accountsComplete />);
  expect(screen.getByText("Amount owed by active customers")).toBeTruthy();
  expect(screen.getByText("Amount owed by inactive customers")).toBeTruthy();
  expect(screen.getAllByText("$7.00")).toHaveLength(2);
  expect(screen.getByText("$5.00")).toBeTruthy();
  expect(screen.getByText(/1 active customer owes a balance/)).toBeTruthy();
  expect(screen.getByText(/1 inactive customer owes a balance; not included in the dashboard total/)).toBeTruthy();
});
it("does not report balance totals while any loaded account allocation is pending or unreconciled", () => {
  const { rerender } = render(<CreditStats accounts={[{ ...account, allocationStatus: "pending" }]} agingByCustomer={{ "account-a": ready() }} accountsComplete />);
  const activeBalanceCard = () => screen.getByText("Amount owed by active customers").parentElement?.parentElement?.textContent ?? "";
  expect(activeBalanceCard()).toContain("Needs review");
  expect(activeBalanceCard()).not.toContain("$7.00");
  expect(activeBalanceCard()).toContain("Balance count needs review");
  expect(screen.getByText(/Share of credit limits currently owed: Needs review/)).toBeTruthy();
  expect(screen.getAllByText("Needs review").length).toBeGreaterThan(1);
  rerender(<CreditStats accounts={[{ ...account, allocationStatus: "unreconciled" }]} agingByCustomer={{ "account-a": ready() }} accountsComplete />);
  expect(activeBalanceCard()).toContain("Needs review");
  expect(activeBalanceCard()).not.toContain("$7.00");
  expect(screen.getByText(/Share of credit limits currently owed: Needs review/)).toBeTruthy();
});
it("never substitutes zero for pending or unreconciled aging", () => {
  const { rerender } = render(<CreditStats accounts={[account]} agingByCustomer={{}} accountsComplete />);
  expect(screen.getByText("Still checking")).toBeTruthy();
  rerender(<CreditStats accounts={[account]} agingByCustomer={{ "account-a": ready({ unreconciled: 700 }) }} accountsComplete />);
  expect(screen.getAllByText("Needs review").length).toBeGreaterThan(1);
});
it("shows all seven buckets, unlimited credit and explicit inactive status", () => {
  render(<CreditCustomerCard account={{ ...account, unlimited: true, limitCents: 0, isActive: false }} aging={ready({ current: 1, undated: 2, unreconciled: 3 })} onRecordPayment={vi.fn()} onAddBalance={vi.fn()} onViewHistory={vi.fn()} onRefreshAllocation={vi.fn()} />);
  for (const label of ["Not overdue:", "No due date:"]) expect(screen.getByText(label)).toBeTruthy();
  expect(screen.getByText(/Some balance amounts need review/)).toBeTruthy();
  expect(screen.getByText("No set credit limit")).toBeTruthy();
  expect(screen.getByText(/Inactive/)).toBeTruthy();
  expect((screen.getByRole("button", { name: "Record a payment" }) as HTMLButtonElement).disabled).toBe(true);
});
it("prefills account payment actions and filters history by account identifier", () => {
  const { rerender } = render(<CreditPage />);
  fireEvent.click(within(screen.getByRole("article", { name: "Account alpha" })).getByRole("button", { name: "View payment history" }));
  expect(mocks.manager.loadCustomerHistory).toHaveBeenCalledWith("account-a", "Account alpha");
  const history = document.getElementById("credit-history")!;
  fireEvent.click(within(screen.getByRole("article", { name: "Account alpha" })).getByRole("button", { name: "Record a payment" }));
  expect(mocks.manager.setShowPaymentDialog).toHaveBeenCalledWith(true);
  mocks.manager.showPaymentDialog = true; rerender(<CreditPage />);
  expect((screen.getByLabelText("Customer") as HTMLSelectElement).value).toBe("account-a");
});
it("keeps pending requests distinct and exposes explicit sync and pagination", () => {
  mocks.manager.pendingCount = 1;
  render(<CreditPage />);
  expect(screen.getByText(/1 change is saved/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button", { name: "Try sending again" })); expect(mocks.manager.syncPending).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Check which changes were saved" })); expect(mocks.manager.resolvePending).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Load more customers" })); expect(mocks.manager.loadMoreAccounts).toHaveBeenCalledTimes(1);
  expect(screen.getAllByRole("button", { name: "Add to a balance" }).every(button => (button as HTMLButtonElement).disabled)).toBe(true);
});
it("respects screen privacy masking", () => {
  mocks.privacy.manualEnabled = true;
  render(<CreditPage />);
  expect(screen.queryByText("Account alpha")).toBeNull(); expect(screen.queryByText("Account beta")).toBeNull();
});
it("preserves a date-only extension date and leaves unspecified dates empty", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<ExtensionDialog open onOpenChange={vi.fn()} accounts={[account]} selectedCustomerId="account-a" onSubmit={onSubmit} />);
  expect((screen.getByLabelText("Due date (optional)") as HTMLInputElement).value).toBe("");
  fireEvent.change(screen.getByLabelText("Amount ($)"), { target: { value: "1.25" } });
  fireEvent.click(screen.getByRole("button", { name: "Add to a balance" }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ customer_id: "account-a", amount: 1.25, due_date: undefined })));
  fireEvent.change(screen.getByLabelText("Due date (optional)"), { target: { value: "2026-10-15" } });
  fireEvent.click(screen.getByRole("button", { name: "Add to a balance" }));
  await waitFor(() => expect(onSubmit).toHaveBeenLastCalledWith(expect.objectContaining({ due_date: "2026-10-15" })));
});
it("preserves payment method and omits inactive accounts from selection", async () => {
  const onSubmit = vi.fn().mockResolvedValue(undefined);
  render(<PaymentDialog open onOpenChange={vi.fn()} accounts={[account, { ...account, customerId: "inactive", displayName: "Inactive", isActive: false }]} selectedCustomerId="account-a" onSubmit={onSubmit} />);
  expect(screen.queryByRole("option", { name: "Inactive" })).toBeNull();
  fireEvent.change(screen.getByLabelText("Amount ($)"), { target: { value: "2.50" } });
  fireEvent.change(screen.getByLabelText("How was the payment received?"), { target: { value: "transfer" } });
  fireEvent.click(screen.getByRole("button", { name: "Record a payment" }));
  await waitFor(() => expect(onSubmit).toHaveBeenCalledWith(expect.objectContaining({ amount: 2.5, payment_method: "transfer" })));
});
it("clears private dialog fields on an operator change within one business", () => {
  mocks.manager.showExtensionDialog = true;
  const { rerender } = render(<CreditPage />);
  fireEvent.change(screen.getByLabelText("Note (optional)"), { target: { value: "Private draft" } });
  mocks.userId = "other-operator"; rerender(<CreditPage />);
  expect((screen.getByLabelText("Note (optional)") as HTMLInputElement).value).toBe("");
});

it("rejects extensions beyond finite available credit and bounds private notes", async () => {
  const onSubmit = vi.fn();
  render(<ExtensionDialog open onOpenChange={vi.fn()} accounts={[account]} selectedCustomerId="account-a" onSubmit={onSubmit} />);
  expect((screen.getByLabelText("Note (optional)") as HTMLInputElement).maxLength).toBe(500);
  fireEvent.change(screen.getByLabelText("Amount ($)"), { target: { value: "3.01" } });
  fireEvent.click(screen.getByRole("button", { name: "Add to a balance" }));
  await waitFor(() => expect(screen.getByRole("alert").textContent).toContain("customer's available credit"));
  expect(onSubmit).not.toHaveBeenCalled();
});
