import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ businessClient: vi.fn(), mutation: vi.fn() }));
vi.mock("@/lib/business/convex-server", () => ({ businessClient: mocks.businessClient }));
import { POST } from "../../app/api/pos/shrinkage/route";
const payload = { requestId: "synthetic-request", inventoryId: "a".repeat(32), quantityGrams: 0.4, shrinkageType: "damaged", note: "Synthetic note" };
const request = (body: unknown = payload) => new NextRequest("https://example.invalid/api/pos/shrinkage", { method: "POST", body: JSON.stringify(body) });
beforeEach(() => { vi.resetAllMocks(); mocks.businessClient.mockResolvedValue({ businessId: "trusted-business", expectedUserId: "trusted-user", client: { mutation: mocks.mutation } }); });
it("sends only trusted tenant/actor context and the same request ID to Convex", async () => {
  const receipt = { success: true, shrinkage_id: "receipt", new_inventory_grams: 1.6, costCents: 5, replayed: true };
  mocks.mutation.mockResolvedValue(receipt);
  const response = await POST(request({ ...payload, businessId: "foreign", expectedUserId: "foreign" }));
  expect(response.status).toBe(201); expect(await response.json()).toEqual(receipt);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(mocks.mutation.mock.calls[0][1]).toEqual({ businessId: "trusted-business", expectedUserId: "trusted-user", productId: payload.inventoryId, requestId: payload.requestId, quantityGrams: 0.4, shrinkageType: "damaged", note: payload.note });
});
it("rejects missing request IDs and malformed bodies without writing", async () => {
  expect((await POST(request({ ...payload, requestId: undefined }))).status).toBe(400);
  expect((await POST(request(null))).status).toBe(400);
  expect(mocks.mutation).not.toHaveBeenCalled();
});
it.each([["APPROVAL_REQUIRED", 403], ["INSUFFICIENT_STOCK", 409], ["CONFLICT", 409], ["INVALID_STATE", 503], ["FORBIDDEN", 403], ["UNAUTHORIZED", 401]])("maps %s without exposing backend content", async (code, status) => {
  mocks.mutation.mockRejectedValue(new Error(`${code}: private backend content`));
  const response = await POST(request()); expect(response.status).toBe(status);
  const body = await response.json(); expect(body.code).toBe(code); expect(JSON.stringify(body)).not.toContain("private backend");
});
