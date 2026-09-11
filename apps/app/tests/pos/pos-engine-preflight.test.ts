import { afterEach, expect, it, vi } from "vitest";
import { POSEngine } from "@/lib/utils/pos-engine";
afterEach(() => { vi.unstubAllGlobals(); });
it("sends the selected business and maps canonical credit balances", async () => {
  const fetcher = vi.fn().mockResolvedValue(new Response(JSON.stringify({ credit: { valid: true, maxLimit: 100, currentBalance: 20 } })));
  vi.stubGlobal("fetch", fetcher);
  const engine = new POSEngine();
  engine.setCustomer("customer");
  expect(await engine.validateCreditLimit("tenant")).toEqual({ valid: true, credit_limit: 100, current_balance: 20, warning: undefined });
  expect(fetcher.mock.calls[0][1].headers["x-business-id"]).toBe("tenant");
});
it.each([new Response("{}", { status: 503 }), new Response("{}")])("never treats an unavailable credit response as approval", async response => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(response));
  const engine = new POSEngine();
  engine.setCustomer("customer");
  expect(await engine.validateCreditLimit("tenant")).toMatchObject({ valid: false });
});
it("fails closed on a disconnected validation service", async () => {
  vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new Error("offline")));
  const engine = new POSEngine();
  engine.setCustomer("customer");
  expect(await engine.validateCreditLimit("tenant")).toMatchObject({ valid: false });
  expect(await engine.validateStock("tenant")).toMatchObject({ valid: false });
});

function checkoutEngine() {
  const engine = new POSEngine();
  engine.addItem({ inventory_id: "product", product_name: "Synthetic", sku: "SYNTHETIC", quantity: 1, unit_price: 10 });
  return engine;
}
function quoted(total = 11) { return new Response(JSON.stringify({ success: true, quote: { total, taxAmount: 1, subtotalAfterDiscount: total - 1 } })); }
function completed() { return new Response(JSON.stringify({ success: true, saleId: "sale", orderNumber: "WEB-TEST", totals: { total: 11, changeAmount: 0 } }), { status: 201 }); }
it("requires review when the canonical quote changes the displayed total", async () => {
  const fetcher = vi.fn().mockImplementation(async (url: string) => url.endsWith("quote") ? quoted() : completed());
  vi.stubGlobal("fetch", fetcher);
  const engine = checkoutEngine();
  expect(await engine.checkout("tenant")).toMatchObject({ success: false, error: expect.stringContaining("Review") });
  expect(engine.getCart()).toMatchObject({ total: 11, tax_amount: 1 });
  expect(fetcher).toHaveBeenCalledTimes(1);
  expect(await engine.checkout("tenant")).toMatchObject({ success: true });
  const posted = JSON.parse(fetcher.mock.calls[2][1].body);
  expect(posted.expectedTotal).toBe(11);
  expect(fetcher.mock.calls[2][1].headers["x-business-id"]).toBe("tenant");
});
it("reuses the identical checkout body after an uncertain response without requoting", async () => {
  let attempts = 0;
  const fetcher = vi.fn().mockImplementation(async (url: string) => {
    if (url.endsWith("quote")) return quoted();
    if (++attempts === 1) throw new Error("response lost");
    return completed();
  });
  vi.stubGlobal("fetch", fetcher);
  const engine = checkoutEngine(); engine.setTaxRate(0.1);
  expect(await engine.checkout("tenant")).toMatchObject({ success: false });
  expect(await engine.checkout("tenant")).toMatchObject({ success: true });
  expect(fetcher.mock.calls[1][1].body).toBe(fetcher.mock.calls[2][1].body);
  expect(fetcher.mock.calls.filter(([url]) => url.endsWith("quote"))).toHaveLength(1);
});
it("blocks a different cart while the original submission is unconfirmed", async () => {
  const fetcher = vi.fn().mockImplementation(async (url: string) => { if (url.endsWith("quote")) return quoted(); throw new Error("response lost"); });
  vi.stubGlobal("fetch", fetcher);
  const engine = checkoutEngine(); engine.setTaxRate(0.1);
  await engine.checkout("tenant"); engine.updateQuantity("product", 2);
  expect(await engine.checkout("tenant")).toMatchObject({ success: false, error: expect.stringContaining("previous checkout") });
  expect(fetcher).toHaveBeenCalledTimes(2);
});
it("does not duplicate an in-flight checkout", async () => {
  let release!: (value: Response) => void;
  vi.stubGlobal("fetch", vi.fn().mockImplementation((url: string) => url.endsWith("quote") ? new Promise(resolve => { release = resolve; }) : Promise.resolve(completed())));
  const engine = checkoutEngine(); engine.setTaxRate(0.1);
  const first = engine.checkout("tenant");
  expect(await engine.checkout("tenant")).toMatchObject({ success: false, error: expect.stringContaining("already") });
  release(quoted()); expect(await first).toMatchObject({ success: true });
});
