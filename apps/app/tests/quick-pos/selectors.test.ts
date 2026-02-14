import { describe, expect, it } from "vitest";
import { canUseCredit, getSubtotal, getTotal } from "@/lib/quick-pos/selectors";
import type { QuickPosState } from "@/lib/quick-pos/types";

const baseState: QuickPosState = {
  cartItems: [
    { id: "a", inventoryId: "inv-a", name: "A", unitPrice: 5, qty: 2, source: "inventory" },
    { id: "b", inventoryId: null, name: "B", unitPrice: 3, qty: 1, source: "manual" },
  ],
  customer: { id: null, phone: "", alias: null, remainingCredit: 0 },
  payment: { method: null, receipt: "none", creditConfirmed: false },
  ui: { search: "", exitDialogOpen: false, processing: false, hardError: null, successMessage: null },
  session: { lastSaleId: null, lastCompletedAt: null },
  creditPolicyEnabled: false,
};

describe("quick pos selectors", () => {
  it("calculates totals", () => {
    expect(getSubtotal(baseState)).toBe(13);
    expect(getTotal(baseState)).toBe(13);
  });

  it("enforces credit eligibility", () => {
    expect(canUseCredit(baseState)).toBe(false);

    const withPolicy = {
      ...baseState,
      creditPolicyEnabled: true,
      customer: {
        id: "cust-1",
        phone: "1112223333",
        alias: "Test",
        remainingCredit: 100,
      },
    };

    expect(canUseCredit(withPolicy)).toBe(true);
  });
});
