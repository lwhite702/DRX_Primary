import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/audit-logs/route";
import { NextRequest } from "next/server";
import { hasBusinessPermission } from "@/lib/auth/server-guards";
import { getPlatformAdmin } from "@/lib/auth/platform-admin";
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { ensureServerFlag } from "@/lib/posthog/server-flags";

const mocks = vi.hoisted(() => ({
  businessClient: vi.fn(),
  query: vi.fn(),
}));

vi.mock("@/lib/auth/platform-admin", () => ({ getPlatformAdmin: vi.fn() }));
vi.mock("@/lib/auth/server-guards", () => ({ hasBusinessPermission: vi.fn() }));
vi.mock("@/app/api/pos/_lib/server", () => ({ resolveAuthContext: vi.fn() }));
vi.mock("@/lib/posthog/server-flags", () => ({ ensureServerFlag: vi.fn() }));
vi.mock("@/lib/business/convex-server", () => ({ businessClient: mocks.businessClient }));

describe("Audit Logs API Integration", () => {
  const mockBusinessId = "test-business-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasBusinessPermission).mockResolvedValue(true);
    vi.mocked(getPlatformAdmin).mockResolvedValue(null);
    vi.mocked(resolveAuthContext).mockResolvedValue({
      userId: "manager-1",
      businessId: mockBusinessId,
    });
    vi.mocked(ensureServerFlag).mockResolvedValue(true);
    mocks.businessClient.mockResolvedValue({
      client: { query: mocks.query },
      businessId: mockBusinessId,
      expectedUserId: "manager-1",
    });
    mocks.query.mockResolvedValue([
      { id: "scoped-log", businessId: mockBusinessId, timestamp: 1773136800000 },
    ]);
  });

  it("does not grant a platform admin implicit business-audit access without tenant context", async () => {
    vi.mocked(getPlatformAdmin).mockResolvedValue({ userId: "admin-1" });
    vi.mocked(resolveAuthContext).mockResolvedValue({
      userId: "admin-1",
      businessId: null,
    });

    const req = new NextRequest("http://localhost:3000/api/admin/audit-logs");
    const res = await GET(req);
    const data = await res.json();

    expect(mocks.query).not.toHaveBeenCalled();
    expect(data.items).toBeUndefined();
    expect(res.status).toBe(403);
  });

  it("should filter logs by business_id", async () => {
    const req = new NextRequest(
      `http://localhost:3000/api/admin/audit-logs?business_id=${mockBusinessId}`,
    );
    const res = await GET(req);
    const data = await res.json();

    expect(mocks.query).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        businessId: mockBusinessId,
      }),
    );
    expect(data.items[0].id).toBe("scoped-log");
    expect(res.status).toBe(200);
  });
});
