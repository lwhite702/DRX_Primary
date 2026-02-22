import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QuickPosProvider } from "@/lib/quick-pos/store";
import PaymentPage from "@/app/pos/payment/page";
import { QUICK_POS_STORAGE_KEY } from "@/lib/quick-pos/constants";
import type { QuickPosState } from "@/lib/quick-pos/types";

const replace = vi.fn();
const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
    push: vi.fn(),
  }),
}));

function seedState(overrides?: Partial<QuickPosState>) {
  const base: QuickPosState = {
    cartItems: [
      {
        id: "inv:1",
        inventoryId: "11111111-1111-4111-8111-111111111111",
        name: "Item One",
        unitPrice: 5,
        qty: 2,
        source: "inventory",
      },
    ],
    customer: {
      id: null,
      phone: "",
      alias: null,
      remainingCredit: 0,
    },
    payment: {
      method: "cash",
      receipt: "none",
      creditConfirmed: false,
    },
    ui: {
      search: "",
      exitDialogOpen: false,
      processing: false,
      hardError: null,
      successMessage: null,
    },
    session: {
      lastSaleId: null,
      lastCompletedAt: null,
      pendingIdempotencyKey: null,
    },
    creditPolicyEnabled: true,
  };

  const state: QuickPosState = {
    ...base,
    ...overrides,
    session: {
      ...base.session,
      ...(overrides?.session || {}),
    },
    payment: {
      ...base.payment,
      ...(overrides?.payment || {}),
    },
  };

  window.sessionStorage.setItem(QUICK_POS_STORAGE_KEY, JSON.stringify(state));
}

describe("quick pos payment idempotency", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    replace.mockReset();

    fetchMock
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: "Payment failed" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true, saleId: "sale_123" }),
      });

    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      "77777777-7777-4777-8777-777777777777",
    );

    seedState();
  });

  it("reuses the same idempotency key across retry and completes once", async () => {
    render(
      <QuickPosProvider>
        <PaymentPage />
      </QuickPosProvider>,
    );

    const completeButton = await screen.findByRole("button", { name: "Complete Sale" });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    const firstBody = JSON.parse(fetchMock.mock.calls[0][1].body as string);
    const secondBody = JSON.parse(fetchMock.mock.calls[1][1].body as string);

    expect(firstBody.idempotencyKey).toBe("77777777-7777-4777-8777-777777777777");
    expect(secondBody.idempotencyKey).toBe(firstBody.idempotencyKey);
    expect(replace).toHaveBeenCalledWith("/pos/complete");
  });
});
