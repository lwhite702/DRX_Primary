import { beforeEach, describe, expect, it } from "vitest";
import { act, render, waitFor } from "@testing-library/react";
import { QuickPosProvider, useQuickPosStore } from "@/lib/quick-pos/store";
import { QUICK_POS_STORAGE_KEY } from "@/lib/quick-pos/constants";

let storeRef: ReturnType<typeof useQuickPosStore> | null = null;

function Harness() {
  storeRef = useQuickPosStore();
  return null;
}

describe("quick pos store", () => {
  beforeEach(() => {
    window.sessionStorage.clear();
  });

  it("adds, increments, and removes items", () => {
    render(
      <QuickPosProvider>
        <Harness />
      </QuickPosProvider>,
    );

    act(() => {
      storeRef!.addItem({
        id: "inv:1",
        inventoryId: "1",
        name: "Item",
        unitPrice: 2,
        qty: 1,
        source: "inventory",
      });
    });

    expect(storeRef!.state.cartItems[0].qty).toBe(1);

    act(() => {
      storeRef!.incrementItem("inv:1");
    });

    expect(storeRef!.state.cartItems[0].qty).toBe(2);

    act(() => {
      storeRef!.removeItem("inv:1");
    });

    expect(storeRef!.state.cartItems).toHaveLength(0);
  });

  it("updates item price with override reason while preserving original price", () => {
    render(
      <QuickPosProvider>
        <Harness />
      </QuickPosProvider>,
    );

    act(() => {
      storeRef!.addItem({
        id: "inv:override-1",
        inventoryId: "prod-1",
        name: "Premium Flower",
        unitPrice: 50,
        qty: 2,
        source: "inventory",
        weightGrams: 0.7,
        requestedAmountCents: 5_000,
      });
    });

    expect(storeRef!.subtotal).toBe(100);

    act(() => {
      storeRef!.updateItemPrice("inv:override-1", 40, "Loyal customer discount");
    });

    expect(storeRef!.state.cartItems[0]).toMatchObject({
      unitPrice: 40,
      originalPrice: 50,
      overrideReason: "Loyal customer discount",
      requestedAmountCents: undefined,
    });
    expect(storeRef!.subtotal).toBe(80);
  });

  it("resets after completion while preserving credit policy", () => {
    render(
      <QuickPosProvider>
        <Harness />
      </QuickPosProvider>,
    );

    act(() => {
      storeRef!.setCreditPolicy(true);
      storeRef!.markCompleted({ saleId: "sale-1", total: 4, receipt: "none" });
      storeRef!.resetForNextSale();
    });

    expect(storeRef!.state.cartItems).toHaveLength(0);
    expect(storeRef!.state.creditPolicyEnabled).toBe(true);
  });

  it("updates a whole-unit line and its displayed tier when incrementing across a bulk threshold", () => {
    render(
      <QuickPosProvider>
        <Harness />
      </QuickPosProvider>,
    );

    act(() => {
      storeRef!.addItem({
        id: "inv:bulk",
        inventoryId: "22222222-2222-4222-8222-222222222222",
        name: "Whole case",
        unitPrice: 10,
        qty: 5,
        source: "inventory",
        commerceConfig: {
          fractionalEnabled: false,
          sellingUnit: "case",
          decimalPrecision: 0,
          minimumSaleQuantity: 1,
          quantityIncrement: 2,
          baseUnitPrice: 10,
          suggestedDollarAmounts: [50],
          suggestedQuantities: [1, 3],
          bulkPriceTiers: [
            {
              id: "six-cases",
              label: "7+ cases",
              minimumQuantity: 7,
              unitPrice: 8,
            },
          ],
        },
      });
      storeRef!.incrementItem("inv:bulk");
    });

    expect(storeRef!.state.cartItems[0]).toMatchObject({
      qty: 7,
      unitPrice: 8,
      bulkTierApplied: "7+ cases",
    });
    expect(storeRef!.subtotal).toBe(56);
  });

  it("persists and clears pending idempotency key correctly", () => {
    render(
      <QuickPosProvider>
        <Harness />
      </QuickPosProvider>,
    );

    act(() => {
      storeRef!.setIdempotencyKey("77777777-7777-4777-8777-777777777777");
    });

    expect(storeRef!.state.session.pendingIdempotencyKey).toBe(
      "77777777-7777-4777-8777-777777777777",
    );

    act(() => {
      storeRef!.clearIdempotencyKey();
    });

    expect(storeRef!.state.session.pendingIdempotencyKey).toBeNull();

    act(() => {
      storeRef!.setIdempotencyKey("88888888-8888-4888-8888-888888888888");
      storeRef!.markCompleted({ saleId: "sale-2", total: 0, receipt: "none" });
    });

    expect(storeRef!.state.session.pendingIdempotencyKey).toBeNull();
  });

  it("tracks delivery checkout details without mixing them into the sale total locally", () => {
    render(
      <QuickPosProvider>
        <Harness />
      </QuickPosProvider>,
    );

    act(() => {
      storeRef!.setDelivery({
        enabled: true,
        address: "100 Example Ave",
        vendorFeeCents: 1250,
        feeAllocation: "charge_customer",
        feeTaxable: true,
      });
    });

    expect(storeRef!.state.delivery).toEqual({
      enabled: true,
      address: "100 Example Ave",
      vendorFeeCents: 1250,
      feeAllocation: "charge_customer",
      feeTaxable: true,
    });
    expect(storeRef!.total).toBe(0);
  });

  it("does not hydrate carts stored with the obsolete Convex ID version", async () => {
    window.sessionStorage.setItem(
      "quick_pos_state_v1",
      JSON.stringify({
        cartItems: [
          {
            id: "inv:legacy",
            inventoryId: "jh7legacyconvexid",
            name: "Legacy Item",
            unitPrice: 10,
            qty: 1,
            source: "inventory",
          },
        ],
      }),
    );

    render(
      <QuickPosProvider>
        <Harness />
      </QuickPosProvider>,
    );

    await waitFor(() => {
      expect(storeRef!.state.cartItems).toHaveLength(0);
    });
    expect(QUICK_POS_STORAGE_KEY).toBe("quick_pos_state_v2");
    expect(window.sessionStorage.getItem("quick_pos_state_v1")).not.toBeNull();
  });
});
