import type { QuickPosState } from "@/lib/quick-pos/types";

export function getSubtotal(state: QuickPosState): number {
  return state.cartItems.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
}

export function getTax(_state: QuickPosState): number {
  return 0;
}

export function getDiscount(state: QuickPosState): number {
  return (state.discount?.amountCents ?? 0) / 100;
}

export function getTotal(state: QuickPosState): number {
  const subtotal = getSubtotal(state);
  const discount = getDiscount(state);
  return Math.max(0, subtotal - discount) + getTax(state);
}

export function canUseCredit(state: QuickPosState): boolean {
  return (
    state.creditPolicyEnabled &&
    Boolean(state.customer.id) &&
    typeof state.customer.remainingCredit === "number" &&
    state.customer.remainingCredit > 0
  );
}
