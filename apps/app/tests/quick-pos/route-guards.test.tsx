import { describe, expect, it, vi, beforeEach } from "vitest";
import { render, waitFor } from "@testing-library/react";
import { QuickPosProvider } from "@/lib/quick-pos/store";
import PaymentPage from "@/app/pos/payment/page";
import CompletePage from "@/app/pos/complete/page";

const replace = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    replace,
    push: vi.fn(),
  }),
}));

describe("quick pos route guards", () => {
  beforeEach(() => {
    replace.mockReset();
  });

  it("redirects payment to sale when cart is empty", async () => {
    render(
      <QuickPosProvider>
        <PaymentPage />
      </QuickPosProvider>,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/pos/sale");
    });
  });

  it("redirects complete to sale when there is no completion marker", async () => {
    render(
      <QuickPosProvider>
        <CompletePage />
      </QuickPosProvider>,
    );

    await waitFor(() => {
      expect(replace).toHaveBeenCalledWith("/pos/sale");
    });
  });
});
