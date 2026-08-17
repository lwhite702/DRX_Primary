import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { QuickPosProvider } from "@/lib/quick-pos/store";
import QuickPosSalePage from "@/app/(operator)/pos/sale/page";

const fetchMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn() }),
}));

vi.mock("@/components/quick-pos/product-search", () => ({
  ProductSearch: ({
    value,
    onChange,
    items,
  }: {
    value: string;
    onChange: (value: string) => void;
    items: Array<{ id: string; name: string }>;
  }) => (
    <div>
      <input
        aria-label="Product search"
        value={value}
        onChange={(event) => onChange(event.target.value)}
      />
      <div data-testid="search-results">
        {items.map((item) => (
          <span key={item.id}>{item.name}</span>
        ))}
      </div>
    </div>
  ),
}));

vi.mock("@/components/quick-pos/pos-keypad", () => ({
  PosKeypad: () => null,
}));

vi.mock("@/components/quick-pos/customer-inline", () => ({
  CustomerInline: () => null,
}));

vi.mock("@/components/quick-pos/cart-panel", () => ({
  CartPanel: ({ items }: { items: unknown[] }) => (
    <div data-testid="cart-count">{items.length}</div>
  ),
}));

vi.mock("@/components/quick-pos/status-feedback", () => ({
  StatusFeedback: ({ error }: { error: string | null }) => (
    <div role="alert">{error}</div>
  ),
}));

function response(payload: unknown, ok = true) {
  return {
    ok,
    json: async () => payload,
  };
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((resolver) => {
    resolve = resolver;
  });
  return { promise, resolve };
}

const bootstrap = {
  favorites: [
    {
      id: "inventory_1",
      name: "Sold Out Favorite",
      sku: "SO-1",
      barcode: null,
      price: 12,
      quantity_on_hand: 0,
    },
  ],
  recentlySold: [],
  creditPolicy: { enabled: false },
};

describe("quick POS sale recovery", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.sessionStorage.clear();
    vi.stubGlobal("fetch", fetchMock);
  });

  it("keeps a sold-out favorite out of the cart", async () => {
    fetchMock.mockResolvedValue(response(bootstrap));

    render(
      <QuickPosProvider>
        <QuickPosSalePage />
      </QuickPosProvider>,
    );

    fireEvent.click(
      await screen.findByRole("button", { name: /Sold Out Favorite/ }),
    );

    expect(await screen.findByRole("alert")).toHaveTextContent("Out of stock");
    expect(screen.getByTestId("cart-count")).toHaveTextContent("0");
  });

  it("discards a slower response for an obsolete search", async () => {
    const oldSearch = deferred<ReturnType<typeof response>>();
    const newSearch = deferred<ReturnType<typeof response>>();
    fetchMock.mockImplementation((url: string) => {
      if (url === "/api/pos/bootstrap") {
        return Promise.resolve(response({ ...bootstrap, favorites: [] }));
      }
      if (url.includes("search=old")) return oldSearch.promise;
      if (url.includes("search=new")) return newSearch.promise;
      throw new Error(`Unexpected request: ${url}`);
    });

    render(
      <QuickPosProvider>
        <QuickPosSalePage />
      </QuickPosProvider>,
    );

    await waitFor(() => {
      expect(fetchMock).toHaveBeenCalledWith("/api/pos/bootstrap");
    });

    const input = screen.getByRole("textbox", { name: "Product search" });
    fireEvent.change(input, { target: { value: "old" } });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 175));
    });

    fireEvent.change(input, { target: { value: "new" } });
    await act(async () => {
      await new Promise((resolve) => setTimeout(resolve, 175));
    });

    await act(async () => {
      newSearch.resolve(
        response({
          items: [
            {
              id: "new",
              name: "New Result",
              price: 20,
              quantity_on_hand: 2,
            },
          ],
        }),
      );
      await Promise.resolve();
    });
    expect(await screen.findByText("New Result")).toBeInTheDocument();

    await act(async () => {
      oldSearch.resolve(
        response({
          items: [
            {
              id: "old",
              name: "Old Result",
              price: 10,
              quantity_on_hand: 2,
            },
          ],
        }),
      );
      await Promise.resolve();
    });

    expect(screen.queryByText("Old Result")).not.toBeInTheDocument();
    expect(screen.getByText("New Result")).toBeInTheDocument();
  });
});
