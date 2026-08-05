import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveAuthContext: vi.fn(),
  ensureServerFlag: vi.fn(),
  db: {
    $queryRaw: vi.fn(),
    $executeRaw: vi.fn(),
    creditLimit: {
      findFirst: vi.fn(),
    },
    customers: {
      findFirst: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
}));

vi.mock("@/lib/posthog/server-flags", () => ({
  ensureServerFlag: mocks.ensureServerFlag,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import { POST } from "@/app/api/privacy/cleanup/queue/route";

describe("privacy cleanup queue worker route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.DRX_PRIVACY_CLEANUP_SECRET = "test-cleanup-secret";
    mocks.resolveAuthContext.mockResolvedValue({ userId: null, businessId: null });
    mocks.ensureServerFlag.mockResolvedValue(true);
    mocks.db.$executeRaw.mockResolvedValue(undefined);
    mocks.db.creditLimit.findFirst.mockResolvedValue(null);
    mocks.db.customers.findFirst.mockResolvedValue({ id: "cust_1" });
    mocks.db.customers.delete.mockResolvedValue({ id: "cust_1" });
  });

  it("rejects unauthenticated requests when cleanup secret is unset", async () => {
    delete process.env.DRX_PRIVACY_CLEANUP_SECRET;

    const req = new NextRequest("http://localhost:3000/api/privacy/cleanup/queue", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(401);
    expect(mocks.db.customers.delete).not.toHaveBeenCalled();
  });

  it("returns 503 when feature flag is disabled", async () => {
    mocks.ensureServerFlag
      .mockResolvedValueOnce(true)
      .mockResolvedValueOnce(false);

    const req = new NextRequest("http://localhost:3000/api/privacy/cleanup/queue", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cron-secret": "test-cleanup-secret",
      },
      body: JSON.stringify({}),
    });

    const res = await POST(req);
    expect(res.status).toBe(503);
    const body = await res.json();
    expect(body.error).toMatch(/feature is disabled/i);
  });

  it("processes and deletes a queue item when no legal hold or credit balance", async () => {
    mocks.db.$queryRaw
      .mockResolvedValueOnce([
        {
          id: "queue_1",
          business_id: "biz_1",
          customer_id: "cust_1",
          reason: "retention_cutoff",
        },
      ])
      .mockResolvedValueOnce([]);

    const req = new NextRequest("http://localhost:3000/api/privacy/cleanup/queue", {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "x-cron-secret": "test-cleanup-secret",
      },
      body: JSON.stringify({ limit: 10 }),
    });

    const res = await POST(req);
    expect(res.status).toBe(200);

    const payload = await res.json();
    expect(payload.ok).toBe(true);
    expect(payload.processed).toBe(1);
    expect(payload.deleted).toBe(1);
    expect(payload.skipped).toBe(0);

    expect(mocks.db.customers.delete).toHaveBeenCalledWith({
      where: { id: "cust_1" },
    });
  });
});
