import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveAuthContext: vi.fn(),
  db: {
    businessSettings: {
      findMany: vi.fn(),
      update: vi.fn(),
    },
    customers: {
      findMany: vi.fn(),
      deleteMany: vi.fn(),
    },
    systemAuditLog: {
      create: vi.fn(),
    },
  },
}));

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
}));

vi.mock("@/lib/db", () => ({
  db: mocks.db,
}));

import { POST } from "@/app/api/privacy/cleanup/route";

function getNewYorkHour() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/New_York",
    hour: "numeric",
    hour12: false,
  }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
  return Number.isFinite(hour) ? hour : 0;
}

describe("Privacy cleanup with ephemeral priority", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "user_1",
      businessId: "biz_1",
    });
    mocks.db.customers.deleteMany.mockResolvedValue({ count: 1 });
    mocks.db.businessSettings.update.mockResolvedValue({});
    mocks.db.systemAuditLog.create.mockResolvedValue({});
  });

  it("deletes due ephemeral customers before retention cleanup", async () => {
    const localHour = getNewYorkHour();

    mocks.db.businessSettings.findMany.mockResolvedValue([
      {
        id: "settings_1",
        businessId: "biz_1",
        timezone: "America/New_York",
        settingsData: {
          privacy_protocol: {
            retention: {
              enabled: true,
              days: 30,
              frequency: "daily",
              local_hour: localHour,
              hard_delete: true,
              last_run_at: "2000-01-01T00:00:00.000Z",
            },
            ephemeral_profiles: {
              enabled: true,
              default_retention_days: 7,
              allow_in_standard_customer_create: false,
            },
          },
        },
      },
    ]);

    mocks.db.customers.findMany
      .mockResolvedValueOnce([
        { id: "ephemeral_ok", creditLimits: [] },
        { id: "ephemeral_skip", creditLimits: [{ id: "credit_1" }] },
      ])
      .mockResolvedValueOnce([{ id: "retention_ok", creditLimits: [] }]);

    const req = new NextRequest("http://localhost:3000/api/privacy/cleanup", {
      method: "POST",
      body: JSON.stringify({}),
      headers: { "content-type": "application/json" },
    });
    const res = await POST(req);
    const json = await res.json();

    expect(res.status).toBe(200);
    expect(json.ok).toBe(true);
    expect(json.summary[0].ephemeral_deleted).toBe(1);
    expect(json.summary[0].retention_deleted).toBe(1);
    expect(json.summary[0].skipped_due_balance).toBe(1);
    expect(mocks.db.customers.deleteMany).toHaveBeenCalledTimes(2);
  });
});
