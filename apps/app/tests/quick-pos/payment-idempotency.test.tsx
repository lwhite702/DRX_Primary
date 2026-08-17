import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QuickPosProvider } from "@/lib/quick-pos/store";
import PaymentPage from "@/app/(operator)/pos/payment/page";
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
      lastSaleTotal: null,
      lastReceipt: null,
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
        ok: true,
        json: async () => ({
          success: true,
          quote: {
            subtotal: 10,
            subtotalAfterDiscount: 9,
            loyaltyDiscountAmount: 1,
            loyaltyDiscountRate: 0.1,
            taxAmount: 0.72,
            feesTotal: 0,
            total: 9.72,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: false,
        json: async () => ({ success: false, error: "Payment failed" }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          saleId: "sale_123",
          total: 9.72,
          receipt: {
            saleId: "sale_123",
            total: 9.72,
            receipt: "none",
            channels: [],
          },
        }),
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

    await screen.findByText("Loyalty discount");
    expect(screen.getByText("-$1.00")).toBeInTheDocument();
    expect(screen.getByText("$0.72")).toBeInTheDocument();

    const completeButton = await screen.findByRole("button", {
      name: "Complete Sale",
    });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    await screen.findByText("Payment failed");
    const retryButton = await screen.findByRole("button", {
      name: "Complete Sale",
    });
    expect(retryButton).not.toBeDisabled();

    fireEvent.click(retryButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(3);
    });

    const checkoutCalls = fetchMock.mock.calls.filter(
      ([url]) => url === "/api/pos/checkout",
    );
    const firstBody = JSON.parse(checkoutCalls[0][1].body as string);
    const secondBody = JSON.parse(checkoutCalls[1][1].body as string);

    expect(firstBody.idempotencyKey).toBe(
      "77777777-7777-4777-8777-777777777777",
    );
    expect(secondBody.idempotencyKey).toBe(firstBody.idempotencyKey);
    expect(replace).toHaveBeenCalledWith("/pos/complete");
  });

  it("submits inventory and manual items together in one canonical request", async () => {
    seedState({
      cartItems: [
        {
          id: "inv:1",
          inventoryId: "11111111-1111-4111-8111-111111111111",
          name: "Catalog Item",
          unitPrice: 5,
          qty: 2,
          source: "inventory",
        },
        {
          id: "manual:1",
          inventoryId: null,
          name: "Manual Item",
          unitPrice: 3,
          qty: 1,
          source: "manual",
        },
      ],
    });

    render(
      <QuickPosProvider>
        <PaymentPage />
      </QuickPosProvider>,
    );

    const completeButton = await screen.findByRole("button", {
      name: "Complete Sale",
    });
    await waitFor(() => expect(completeButton).not.toBeDisabled());
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledTimes(2);
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/pos/checkout",
      expect.objectContaining({ method: "POST" }),
    );
    const checkoutCall = fetchMock.mock.calls.find(
      ([url]) => url === "/api/pos/checkout",
    );
    expect(checkoutCall).toBeDefined();
    const body = JSON.parse(checkoutCall![1].body as string);
    expect(body.items).toEqual([
      expect.objectContaining({ name: "Catalog Item", source: "inventory" }),
      expect.objectContaining({ name: "Manual Item", source: "manual" }),
    ]);
  });
});
