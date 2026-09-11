import React, { useEffect, useState } from "react";
import type { CreditAccount } from "@/lib/credit/dashboard-client";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { creditMoney } from "./CreditAgingTable";
export interface CreditEntryValues { customer_id: string; amount: number; notes?: string; due_date?: string; payment_method: "cash" | "check" | "transfer" | "other" }
export interface CreditEntryDialogProps { open: boolean; onOpenChange: (open: boolean) => void; accounts: CreditAccount[]; selectedCustomerId?: string; onSubmit: (data: CreditEntryValues) => Promise<void>; disabled?: boolean }
export function CreditEntryDialog({ mode, open, onOpenChange, accounts, selectedCustomerId, onSubmit, disabled }: CreditEntryDialogProps & { mode: "extension" | "payment" }) {
  const [customerId, setCustomerId] = useState("");
  const [amount, setAmount] = useState("");
  const [notes, setNotes] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [method, setMethod] = useState<CreditEntryValues["payment_method"]>("cash");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  useEffect(() => { if (open) { setCustomerId(selectedCustomerId ?? ""); setAmount(""); setNotes(""); setDueDate(""); setMethod("cash"); setError(null); } }, [open, selectedCustomerId]);
  const eligible = accounts.filter(account => account.isActive && (mode === "extension" ? account.creditEnabled : account.balanceCents > 0));
  const selected = eligible.find(account => account.customerId === customerId);
  const title = mode === "extension" ? "Extend Credit" : "Record Payment";
  const prefix = `credit-${mode}`;
  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = Number(amount), cents = Math.round(value * 100);
    if (!selected) { setError("Select an active eligible account."); return; }
    if (!amount.trim() || !Number.isSafeInteger(cents) || cents <= 0 || Math.abs(value * 100 - cents) > 0.000001) { setError("Enter a positive amount with no more than two decimal places."); return; }
    if (mode === "extension" && !selected.unlimited && cents > selected.limitCents - selected.balanceCents) { setError("Extension exceeds the loaded available credit. Refresh if the limit changed."); return; }
    if (mode === "payment" && cents > selected.balanceCents) { setError("Payment cannot exceed the loaded balance. Refresh if the balance changed."); return; }
    if (mode === "extension" && dueDate) {
      const date = new Date(`${dueDate}T00:00:00.000Z`);
      if (dueDate.startsWith("0000-") || !/^\d{4}-\d{2}-\d{2}$/.test(dueDate) || !Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== dueDate) { setError("Enter a valid due date or leave it blank."); return; }
    }
    setSubmitting(true); setError(null);
    try { await onSubmit({ customer_id: selected.customerId, amount: value, notes: notes.trim() || undefined, due_date: mode === "extension" ? dueDate || undefined : undefined, payment_method: method }); }
    catch { setError("The request is not confirmed. Check pending requests before submitting again."); }
    finally { setSubmitting(false); }
  };
  const busy = submitting || disabled;
  return <Dialog open={open} onOpenChange={value => { if (!busy) onOpenChange(value); }}><DialogContent><DialogHeader><DialogTitle>{title}</DialogTitle><DialogDescription>{mode === "extension" ? "Record a credit extension. Leave the due date blank when none was agreed." : "Record a payment received for the selected account."}</DialogDescription></DialogHeader>
    <form onSubmit={submit} className="space-y-4">
      <div className="space-y-2"><Label htmlFor={`${prefix}-account`}>Account</Label><select id={`${prefix}-account`} className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={selected ? customerId : ""} onChange={event => setCustomerId(event.target.value)} disabled={busy} required><option value="">Select account</option>{eligible.map(account => <option key={account.customerId} value={account.customerId}>{account.displayName}</option>)}</select>
      {!eligible.length && <p className="text-sm text-muted-foreground">No eligible loaded accounts. Close this dialog and load more accounts if available.</p>}
      {selected && <p className="text-xs text-muted-foreground">Balance: {creditMoney(selected.balanceCents)} · {selected.creditEnabled ? selected.unlimited ? "Unlimited credit" : `Limit: ${creditMoney(selected.limitCents)}` : "Credit disabled"}</p>}</div>
      <div className="space-y-2"><Label htmlFor={`${prefix}-amount`}>Amount ($)</Label><Input id={`${prefix}-amount`} type="number" min="0.01" step="0.01" required value={amount} onChange={event => setAmount(event.target.value)} disabled={busy} /></div>
      {mode === "extension" ? <div className="space-y-2"><Label htmlFor={`${prefix}-due`}>Due date (optional)</Label><Input id={`${prefix}-due`} type="date" value={dueDate} onChange={event => setDueDate(event.target.value)} disabled={busy} /></div> : <div className="space-y-2"><Label htmlFor={`${prefix}-method`}>Payment method</Label><select id={`${prefix}-method`} value={method} onChange={event => setMethod(event.target.value as CreditEntryValues["payment_method"])} disabled={busy} className="h-10 w-full rounded-md border bg-background px-3 text-sm"><option value="cash">Cash</option><option value="check">Check</option><option value="transfer">Transfer</option><option value="other">Other</option></select></div>}
      <div className="space-y-2"><Label htmlFor={`${prefix}-notes`}>Notes (optional)</Label><Input id={`${prefix}-notes`} value={notes} maxLength={500} onChange={event => setNotes(event.target.value)} disabled={busy} /></div>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>Cancel</Button><Button type="submit" disabled={busy || !eligible.length}>{busy ? "Processing…" : title}</Button></div>
    </form>
  </DialogContent></Dialog>;
}
