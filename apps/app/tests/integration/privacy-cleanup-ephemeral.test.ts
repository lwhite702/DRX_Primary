import { describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ resolveAuthContext: vi.fn(), mutation: vi.fn() }));
vi.mock("@/app/api/pos/_lib/server", () => ({ resolveAuthContext: mocks.resolveAuthContext }));
vi.mock("@/lib/business/convex-server", () => ({ businessClient: vi.fn(async () => ({ client: { mutation: mocks.mutation }, expectedUserId: "user_1" })) }));
import { POST } from "@/app/api/privacy/cleanup/route";

describe("privacy cleanup Convex integration", () => {
  it("returns the canonical Convex summary", async () => {
    mocks.resolveAuthContext.mockResolvedValue({ userId: "user_1", businessId: "biz_1" });
    mocks.mutation.mockResolvedValue([{ business_id: "biz_1", deleted: 2, ephemeral_deleted: 1, retention_deleted: 1, skipped_due_balance: 1, queued_count: 0, retention_days: 30 }]);
    const res = await POST(new NextRequest("http://localhost/api/privacy/cleanup", { method: "POST", body: JSON.stringify({}) }));
    const json = await res.json();
    expect(res.status).toBe(200); expect(json.summary[0].ephemeral_deleted).toBe(1); expect(json.summary[0].retention_deleted).toBe(1);
  });
  it("fails closed when Convex is unavailable", async () => {
    mocks.resolveAuthContext.mockResolvedValue({ userId: "user_1", businessId: "biz_1" }); mocks.mutation.mockRejectedValue(new Error("offline"));
    const res = await POST(new NextRequest("http://localhost/api/privacy/cleanup", { method: "POST" })); expect(res.status).toBe(503);
  });
});
