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
