import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/audit-logs/route";
import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { auth } from "@wrelik/auth/next";

// Mock Wrelik auth
vi.mock("@wrelik/auth/next", () => ({
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
  },
}));

describe("Audit Logs API Integration", () => {
  const mockBusinessId = "test-business-123";
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow super_admin (or any authorized user) to fetch latest logs", async () => {
    // Mock Auth
    (auth as any).mockResolvedValue({ userId: "admin-1" });

    // Mock DB Data
    (db.systemAuditLog.findMany as any).mockResolvedValue([
      { id: "log-1", action: "test", createdAt: new Date() },
    ]);

    const req = new NextRequest("http://localhost:3000/api/admin/audit-logs");
    const res = await GET(req);
    const data = await res.json();

    expect(db.systemAuditLog.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    );

    expect(data).toHaveLength(1);
    expect(res.status).toBe(200);
  });

  it("should filter logs by business_id", async () => {
    // Mock Auth
    (auth as any).mockResolvedValue({ userId: "manager-1" });

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
    expect(data[0].id).toBe("scoped-log");
    expect(res.status).toBe(200);
  });
});
