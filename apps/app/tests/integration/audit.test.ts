import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/audit-logs/route";
import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@/lib/adapters/auth/server";
import { hasBusinessPermission } from "@/lib/auth/server-guards";
import { getPlatformAdmin } from "@/lib/auth/platform-admin";
vi.mock("@/lib/auth/platform-admin", () => ({ getPlatformAdmin: vi.fn() }));
import { resolveAuthContext } from "@/app/api/pos/_lib/server";
import { ensureServerFlag } from "@/lib/posthog/server-flags";

// Mock the repository auth adapter used by the route.
vi.mock("@/lib/adapters/auth/server", () => ({
  auth: vi.fn(),
}));

// Mock Prisma
vi.mock("@/lib/db", () => ({
  db: {
    systemAuditLog: {
      findMany: vi.fn(),
    },
    inventoryLog: {
      findMany: vi.fn(),
    },
    userRole: {
      findFirst: vi.fn(),
    },
    businessProfile: {
      findFirst: vi.fn(),
    },
  },
}));

vi.mock("@/lib/auth/server-guards", () => ({
  hasBusinessPermission: vi.fn(),
}));

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: vi.fn(),
}));

vi.mock("@/lib/posthog/server-flags", () => ({
  ensureServerFlag: vi.fn(),
}));

describe("Audit Logs API Integration", () => {
  const mockBusinessId = "test-business-123";

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(hasBusinessPermission).mockResolvedValue(true);
    vi.mocked(getPlatformAdmin).mockResolvedValue(null);
    (resolveAuthContext as any).mockResolvedValue({
      userId: "admin-1",
      businessId: null,
    });
    (ensureServerFlag as any).mockResolvedValue(true);
    (db.userRole.findFirst as any).mockResolvedValue(null);
    (db.businessProfile.findFirst as any).mockResolvedValue(null);
  });

  it("does not grant a platform admin implicit business-audit access", async () => {
    vi.mocked(getPlatformAdmin).mockResolvedValue({ userId: "admin-1" });
    // Mock Auth
    (auth as any).mockResolvedValue({ userId: "admin-1" });
    (db.userRole.findFirst as any).mockResolvedValue({ id: "role-1" });

    // Mock DB Data
    (db.systemAuditLog.findMany as any).mockResolvedValue([
      { id: "log-1", action: "test", createdAt: new Date() },
    ]);

    const req = new NextRequest("http://localhost:3000/api/admin/audit-logs");
    const res = await GET(req);
    const data = await res.json();

    expect(db.systemAuditLog.findMany).not.toHaveBeenCalled();
    expect(data.items).toBeUndefined();
    expect(res.status).toBe(403);
  });

  it("should filter logs by business_id", async () => {
    // Mock Auth
    (auth as any).mockResolvedValue({ userId: "manager-1" });
    (resolveAuthContext as any).mockResolvedValue({
      userId: "manager-1",
      businessId: mockBusinessId,
    });

    // Mock DB Data
    (db.systemAuditLog.findMany as any).mockResolvedValue([
      { id: "scoped-log", businessId: mockBusinessId },
    ]);

    const req = new NextRequest(
      `http://localhost:3000/api/admin/audit-logs?business_id=${mockBusinessId}`,
    );
    const res = await GET(req);
    const data = await res.json();

    expect(db.systemAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: mockBusinessId },
      }),
    );
    expect(data.items[0].id).toBe("scoped-log");
    expect(res.status).toBe(200);
  });
});
