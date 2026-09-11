import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ businessClient: vi.fn(), action: vi.fn(), mutation: vi.fn() }));
vi.mock("@/lib/business/convex-server", () => ({ businessClient: mocks.businessClient }));
import { GET, POST } from "../../app/api/pos/inventory-check/route";
beforeEach(() => { vi.resetAllMocks(); mocks.businessClient.mockResolvedValue({ businessId: "trusted", expectedUserId: "actor", client: { action: mocks.action, mutation: mocks.mutation } }); });
const payload = { requestId: "attempt", inventoryId: "a".repeat(32), expectedWeightGrams: 10, measuredWeightGrams: 8 };
const request = (body: unknown = payload) => new NextRequest("https://example.invalid/api/pos/inventory-check", { method: "POST", body: JSON.stringify(body) });
it("passes authenticated context and preserves the check snapshot/retry ID", async () => {
  mocks.mutation.mockResolvedValue({ success: true, check_id: "check" });
  const response = await POST(request({ ...payload, businessId: "foreign", expectedUserId: "foreign" }));
  expect(response.status).toBe(201);
  expect(mocks.mutation.mock.calls[0][1]).toEqual({ businessId: "trusted", expectedUserId: "actor", requestId: "attempt", productId: payload.inventoryId, expectedWeightGrams: 10, measuredWeightGrams: 8 });
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
});
it("rejects missing snapshot/retry contract and malformed requests", async () => {
  expect((await POST(request({ inventoryId: payload.inventoryId, measuredWeightGrams: 8 }))).status).toBe(400);
  expect((await POST(request(null))).status).toBe(400); expect(mocks.mutation).not.toHaveBeenCalled();
});
it("uses selected-tenant canonical random selection and handles no eligible products", async () => {
  mocks.action.mockResolvedValue(null);
  expect((await GET(new NextRequest("https://example.invalid/api/pos/inventory-check"))).status).toBe(404);
  expect(mocks.action.mock.calls[0][1]).toEqual({ businessId: "trusted", expectedUserId: "actor" });
});
it.each([["APPROVAL_REQUIRED",403],["CONFLICT",409],["INVALID_STATE",503]])("sanitizes %s failures", async (code, status) => {
  mocks.mutation.mockRejectedValue(new Error(`${code}: private details`));
  const result = await POST(request()); expect(result.status).toBe(status); expect(JSON.stringify(await result.json())).not.toContain("private details");
});
