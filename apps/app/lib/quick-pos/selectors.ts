import type { QuickPosCartItem, QuickPosCustomer, QuickPosState } from "@/lib/quick-pos/types";

const DEFAULT_TIER_RATES_BPS: Record<string, number> = {
  bronze: 500,
  silver: 1000,
  gold: 1500,
  platinum: 2000,
};

export function getEffectiveItemUnitPrice(item: QuickPosCartItem, customer?: QuickPosCustomer): number {
  if (item.source === "manual" || item.overrideReason) {
    return item.unitPrice;
  }
  if (customer?.id && typeof customer.fixedPricePerGram === "number" && customer.fixedPricePerGram > 0) {
    if (item.weightGrams && item.weightGrams > 0) {
      return Math.round(customer.fixedPricePerGram * item.weightGrams * 100) / 100;
    }
    return customer.fixedPricePerGram;
  }
  return item.unitPrice;
}

export function getCustomerDiscountRateBps(customer?: QuickPosCustomer): number {
  if (!customer?.id) return 0;
  const customBps = typeof customer.discountRateBps === "number" && customer.discountRateBps > 0 ? customer.discountRateBps : 0;
  const tierKey = (customer.loyaltyTier || "").toLowerCase();
  const tierBps = DEFAULT_TIER_RATES_BPS[tierKey] ?? 0;
  return Math.max(customBps, tierBps);
}

export function getSubtotal(state: QuickPosState): number {
  return state.cartItems.reduce(
    (sum, item) => sum + getEffectiveItemUnitPrice(item, state.customer) * item.qty,
    0,
  );
}

export function getTax(_state: QuickPosState): number {
  return 0;
}

export function getDiscount(state: QuickPosState): number {
  if ((state.discount?.amountCents ?? 0) > 0) {
    return (state.discount?.amountCents ?? 0) / 100;
  }
  const rateBps = getCustomerDiscountRateBps(state.customer);
  if (rateBps > 0) {
    const subtotal = getSubtotal(state);
    return Math.round(subtotal * (rateBps / 10000) * 100) / 100;
  }
  return 0;
}

export function getDeliveryCustomerFeeCents(state: QuickPosState): number {
  if (!state.delivery?.enabled) return 0;
  const vendorFeeCents = Math.max(0, state.delivery.vendorFeeCents || 0);
  const splitMode = state.delivery.feeSplitMode;
  if (splitMode === "pass_full") return vendorFeeCents;
  if (splitMode === "absorb_full") return 0;
  if (splitMode === "split_half") return Math.round(vendorFeeCents / 2);
  if (splitMode === "custom") {
    return Math.min(vendorFeeCents, Math.max(0, state.delivery.customerFeeCents ?? 0));
  }
  return state.delivery.feeAllocation === "charge_customer" ? vendorFeeCents : 0;
}

export function getCardProcessorFeeCents(state: QuickPosState, baseAmountCents: number): number {
  if (state.payment.cardFeeWaived) return 0;
  if (typeof state.payment.cardFeeCustomCents === "number" && state.payment.cardFeeCustomCents >= 0) {
    return state.payment.cardFeeCustomCents;
  }
  const policy = state.cardFeePolicy;
  if (!policy?.enabled) return 0;

  let cardBaseCents = 0;
  if (state.payment.method === "card") {
    cardBaseCents = Math.max(0, baseAmountCents);
  } else if (state.payment.method === "split" && Array.isArray(state.payment.tenders)) {
    cardBaseCents = state.payment.tenders
      .filter((t) => t.method === "card")
      .reduce((sum, t) => sum + Math.max(0, t.amountCents || 0), 0);
  }
  if (cardBaseCents <= 0) return 0;

  const feeType = policy.feeType;
  const percentPart =
    feeType === "percent" || feeType === "percentage" || feeType === "both"
      ? Math.round((cardBaseCents * Math.max(0, policy.feeBps || 0)) / 10000)
      : 0;
  const flatPart =
    feeType === "flat" || feeType === "both"
      ? Math.max(0, policy.feeFlatCents || 0)
      : 0;
  return percentPart + flatPart;
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
