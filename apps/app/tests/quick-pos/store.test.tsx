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
