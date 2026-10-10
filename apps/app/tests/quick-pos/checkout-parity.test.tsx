import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { QuickPosProvider } from "@/lib/quick-pos/store";
import PaymentPage from "@/app/(operator)/pos/payment/page";
import CompletePage from "@/app/(operator)/pos/complete/page";
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
        unitPrice: 10,
        qty: 1,
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
    delivery: {
      enabled: false,
      address: "",
      vendorFeeCents: 0,
      feeAllocation: "charge_customer",
      feeTaxable: false,
    },
    discount: {
      amountCents: 0,
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
    customer: {
      ...base.customer,
      ...(overrides?.customer || {}),
    },
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

describe("desktop quick pos checkout parity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    replace.mockReset();

    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        success: true,
        quote: {
          subtotal: 10,
          merchandiseTaxAmount: 0.8,
          total: 10.8,
        },
      }),
    });

    vi.stubGlobal("fetch", fetchMock);
    vi.spyOn(globalThis.crypto, "randomUUID").mockReturnValue(
      "12345678-1234-4234-8234-123456789abc",
    );
  });

  it("calculates change due and passes amountPaid when paying with cash", async () => {
    seedState();

    fetchMock
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          quote: {
            subtotal: 10,
            merchandiseTaxAmount: 0.8,
            total: 10.8,
          },
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          success: true,
          saleId: "sale_cash_1",
          total: 10.8,
          changeAmount: 9.2,
          receipt: {
            saleId: "sale_cash_1",
            total: 10.8,
            receipt: "none",
            channels: [],
          },
        }),
      });

    render(
      <QuickPosProvider>
        <PaymentPage />
      </QuickPosProvider>,
    );

    await screen.findByText("$10.80");

    // Cash tender section is visible
    expect(screen.getByRole("heading", { name: "Cash Tendered" })).toBeInTheDocument();

    // Select $20 quick bill
    const bill20 = screen.getByRole("button", { name: "$20" });
    fireEvent.click(bill20);

    // Verify change due is displayed
    expect(screen.getByText("Change Due:")).toBeInTheDocument();
    expect(screen.getByText("$9.20")).toBeInTheDocument();

    // Complete sale
    const completeButton = screen.getByRole("button", { name: "Complete Sale" });
    expect(completeButton).not.toBeDisabled();
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith(
        "/api/pos/checkout",
        expect.objectContaining({
          body: expect.stringContaining('"amountPaid":20'),
        }),
      );
    });

    expect(replace).toHaveBeenCalledWith("/pos/complete");
  });

  it("enforces customer credit limit and requires credit confirmation", async () => {
    seedState({
      payment: {
        method: "credit",
        receipt: "none",
        creditConfirmed: false,
      },
      customer: {
        id: "cust-1",
        phone: "555-1234",
        alias: "Alice VIP",
        remainingCredit: 5, // Order total is $10.80, so credit is insufficient
      },
    });

    render(
      <QuickPosProvider>
        <PaymentPage />
      </QuickPosProvider>,
    );

    await waitFor(() => {
      expect(screen.getAllByText(/\$10\.80/)[0]).toBeInTheDocument();
    });

    // Customer card shows credit info
    expect(screen.getByText("Alice VIP")).toBeInTheDocument();
    expect(screen.getAllByText(/\$5\.00/)[0]).toBeInTheDocument();

    // Credit section warns about insufficient credit
    expect(screen.getByText(/Insufficient credit/)).toBeInTheDocument();

    // Complete Sale button is disabled due to insufficient credit
    const completeButton = screen.getByRole("button", { name: "Complete Sale" });
    expect(completeButton).toBeDisabled();
  });

  it("displays change due and delivery dispatch status on completion page", () => {
    seedState({
      session: {
        lastSaleId: "sale_complete_123",
        lastCompletedAt: Date.now(),
        pendingIdempotencyKey: null,
        lastSaleTotal: 10.8,
        lastReceipt: "print",
        lastChange: 9.2,
        lastIsDelivery: true,
      },
    });

    render(
      <QuickPosProvider>
        <CompletePage />
      </QuickPosProvider>,
    );

    expect(screen.getByText("Sale Complete")).toBeInTheDocument();
    expect(screen.getByText("Sale ID: sale_complete_123")).toBeInTheDocument();
    expect(screen.getByText("Total Charged: $10.80")).toBeInTheDocument();
    expect(screen.getByText("Change Due: $9.20")).toBeInTheDocument();
    expect(screen.getByText("Delivery: Ready for dispatch")).toBeInTheDocument();
    expect(screen.getByText("Receipt: print")).toBeInTheDocument();
  });
});
