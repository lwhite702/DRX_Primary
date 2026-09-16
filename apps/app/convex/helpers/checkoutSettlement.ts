import { v } from "convex/values";

export const checkoutFee = v.object({ type: v.string(), amountCents: v.number(), value: v.optional(v.string()) });
export type CheckoutFee = { type: string; amountCents: number; value?: string };
export type CheckoutPaymentMethod = "cash" | "card" | "credit" | "mixed" | "zelle" | "comp";

export function normalizeFees(fees: CheckoutFee[] | undefined): CheckoutFee[] {
  if ((fees?.length ?? 0) > 20) throw new Error("INVALID_ARGUMENT: Too many fees");
  return (fees ?? []).map(fee => {
    const type = fee.type.trim();
    if (!type || type.length > 80 || (fee.value?.length ?? 0) > 200 || !Number.isSafeInteger(fee.amountCents) || fee.amountCents < 0) throw new Error("INVALID_ARGUMENT: Invalid checkout fee");
    return { type, amountCents: fee.amountCents, ...(fee.value === undefined ? {} : { value: fee.value }) };
  });
}
export function totalFees(fees: CheckoutFee[]): number {
  const total = fees.reduce((sum, fee) => sum + fee.amountCents, 0);
  if (!Number.isSafeInteger(total)) throw new Error("INVALID_ARGUMENT: Fees exceed the safe monetary range");
  return total;
}
export function normalizePaymentReference(value: string | undefined) {
  if (value === undefined) return undefined;
  const reference = value.trim();
  if (!reference || reference.length > 128) throw new Error("INVALID_ARGUMENT: Invalid payment reference");
  return reference;
}

/** Mixed tender may settle in full; any unpaid remainder requires customer credit. */
export function calculateSettlement(method: CheckoutPaymentMethod, total: number, paid: number) {
  if (![total, paid].every(value => Number.isSafeInteger(value) && value >= 0)) throw new Error("INVALID_ARGUMENT: Invalid settlement amount");
  if (method === "cash" && paid < total) throw new Error("PAYMENT_ERROR: Cash tender does not cover the order");
  if ((method === "card" || method === "zelle") && paid !== total) throw new Error(`PAYMENT_ERROR: ${method === "card" ? "Card" : "Zelle"} tender amount must equal the order total`);
  if (method === "credit" && paid !== 0) throw new Error("PAYMENT_ERROR: Credit sales cannot record a tender amount");
  if (method === "comp" && (paid !== 0 || total !== 0)) throw new Error("PAYMENT_ERROR: Comped sales must have zero total and zero tender amount");
  if (method === "mixed" && (paid <= 0 || paid > total)) throw new Error("PAYMENT_ERROR: Mixed tender must be positive and cannot exceed the order total");
  return {
    creditAmountCents: method === "credit" ? total : method === "mixed" ? total - paid : 0,
    changeAmountCents: method === "cash" ? Math.max(0, paid - total) : 0,
  };
}
