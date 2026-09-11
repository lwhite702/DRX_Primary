import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ intelligenceClient: vi.fn(), action: vi.fn() }));
vi.mock("@/app/api/ai/_lib/convex", async importOriginal => ({ ...(await importOriginal<typeof import("@/app/api/ai/_lib/convex")>()), intelligenceClient: mocks.intelligenceClient }));
import { POST } from "@/app/api/ai/inventory-health/route";
const request = (body: unknown) => new NextRequest("http://localhost/api/ai/inventory-health", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
describe("canonical inventory health route authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.intelligenceClient.mockResolvedValue({ client: { action: mocks.action }, businessId: "canonical-business", expectedUserId: "actor" });
    mocks.action.mockResolvedValue(JSON.stringify({ success: true, metrics: { total_items: 1 }, ai_status: "unconfigured", ai_insight: null }));
  });
  it.each([["UNAUTHORIZED:", 401], ["FORBIDDEN:", 403], ["UNAVAILABLE:", 503]])("denies %s before action execution", async (error, status) => {
    mocks.intelligenceClient.mockRejectedValue(new Error(error as string));
    expect((await POST(request({ business_id: "foreign" }))).status).toBe(status);
    expect(mocks.action).not.toHaveBeenCalled();
  });
  it("uses canonical scope and server expected actor with a stable request key", async () => {
    const response = await POST(request({ business_id: "legacy", request_id: "retry-one" }));
    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(mocks.intelligenceClient).toHaveBeenCalledWith("legacy");
    expect(mocks.action).toHaveBeenCalledWith(expect.anything(), { businessId: "canonical-business", expectedUserId: "actor", requestId: "retry-one" });
    expect((await response.json()).metrics.total_items).toBe(1);
  });
  it("generates an identifier when legacy clients omit one", async () => {
    expect((await POST(request({ business_id: "legacy" }))).status).toBe(200);
    expect(mocks.action.mock.calls[0][1].requestId).toMatch(/^[\da-f-]{36}$/);
  });
  it.each([{ business_id: "" }, { business_id: "x", expectedUserId: "attacker" }, { business_id: "x", request_id: "a".repeat(201) }])("rejects invalid input before data access", async body => {
    expect((await POST(request(body))).status).toBe(400);
    expect(mocks.intelligenceClient).not.toHaveBeenCalled();
  });
  it("sanitizes backend failures and never substitutes empty metrics", async () => {
    mocks.action.mockRejectedValue(new Error("secret customer payload"));
    const response = await POST(request({ business_id: "legacy" }));
    expect(response.status).toBe(503);
    const body = await response.text();
    expect(body).not.toContain("secret"); expect(body).not.toContain("metrics");
  });
  it("retains explicit optional provider failure status", async () => {
    mocks.action.mockResolvedValue(JSON.stringify({ success: true, metrics: { total_items: 1 }, ai_status: "failed", ai_insight: null, ai_error: "Temporarily unavailable" }));
    const response = await POST(request({ business_id: "legacy" }));
    expect((await response.json()).ai_status).toBe("failed");
  });
});
