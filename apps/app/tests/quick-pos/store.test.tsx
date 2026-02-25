import { describe, expect, it } from "vitest";
import { act, render } from "@testing-library/react";
import { QuickPosProvider, useQuickPosStore } from "@/lib/quick-pos/store";

let storeRef: ReturnType<typeof useQuickPosStore> | null = null;

function Harness() {
  storeRef = useQuickPosStore();
  return null;
}

describe("quick pos store", () => {
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
});
