import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({ resolveAuthContext: vi.fn(), mutation: vi.fn() }));
vi.mock("@/app/api/pos/_lib/server", () => ({ resolveAuthContext: mocks.resolveAuthContext }));
vi.mock("@/lib/business/convex-server", () => ({ businessClient: vi.fn(async () => ({ client: { mutation: mocks.mutation }, expectedUserId: "user_1" })) }));
import { POST } from "@/app/api/privacy/cleanup/queue/route";

describe("privacy cleanup queue worker route", () => {
  beforeEach(() => { vi.clearAllMocks(); mocks.resolveAuthContext.mockResolvedValue({ userId: "user_1", businessId: "biz_1" }); mocks.mutation.mockResolvedValue([{ deleted: 1, ephemeral_deleted: 1, retention_deleted: 0, skipped_due_balance: 0, queued_count: 0, retention_days: 7, business_id: "biz_1" }]); });
  it("rejects unauthenticated requests", async () => { mocks.resolveAuthContext.mockResolvedValue({ userId: null, businessId: null }); const res = await POST(new NextRequest("http://localhost/api/privacy/cleanup/queue", { method: "POST" })); expect(res.status).toBe(401); });
  it("returns 503 when Convex cleanup is unavailable", async () => { mocks.mutation.mockRejectedValue(new Error("offline")); const res = await POST(new NextRequest("http://localhost/api/privacy/cleanup/queue", { method: "POST" })); expect(res.status).toBe(503); });
  it("returns the Convex cleanup summary", async () => { const res = await POST(new NextRequest("http://localhost/api/privacy/cleanup/queue", { method: "POST", body: JSON.stringify({ limit: 10 }) })); const payload = await res.json(); expect(res.status).toBe(200); expect(payload.processed).toBe(1); expect(mocks.mutation).toHaveBeenCalledTimes(1); });
});
