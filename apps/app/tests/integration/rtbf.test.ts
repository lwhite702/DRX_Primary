import { describe, it, expect, vi, beforeEach } from "vitest";
import { initiateRTBF } from "@/app/actions/rtbf";

const mockDb = {
  userRole: {
    findFirst: vi.fn(),
    deleteMany: vi.fn(),
  },
  adminUser: {
    findFirst: vi.fn(),
  },
  systemAuditLog: {
    create: vi.fn(),
  },
  user: {
    update: vi.fn(),
  },
};

vi.mock("@/lib/db", () => ({
  db: new Proxy({}, {
    get(target, prop) {
      return (mockDb as any)[prop];
    }
  }),
}));

const mockAuth = vi.fn();

vi.mock("@/lib/adapters/auth/server", () => ({
  auth: () => mockAuth(),
}));

describe("RTBF Privacy Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockAuth.mockResolvedValue({ userId: "owner-1" });

    // Setup default positive mocks
    mockDb.userRole.findFirst.mockResolvedValue({ role: "owner" });
    mockDb.adminUser.findFirst.mockResolvedValue(null);
    mockDb.systemAuditLog.create.mockResolvedValue({});
    mockDb.user.update.mockResolvedValue({});
    mockDb.userRole.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("should mask user PII and remove roles when initiated by owner", async () => {
    // Start RTBF
    const result = await initiateRTBF("tenant-1", "user-shred");

    expect(result.success).toBe(true);

    // Verify user database update was called with masked metadata
    expect(mockDb.user.update).toHaveBeenCalledWith({
      where: { id: "user-shred" },
      data: expect.objectContaining({
        name: "DELETED_USER_RTBF",
        email: expect.stringContaining("deleted_user-shr@deleted.deelrx.com"),
        status: "ARCHIVED",
      }),
    });

    // Verify audit logs were written
    expect(mockDb.systemAuditLog.create).toHaveBeenCalledTimes(2);
    expect(mockDb.systemAuditLog.create).toHaveBeenNthCalledWith(
      1,
      expect.objectContaining({
        data: expect.objectContaining({
          action: "rtbf_initiated",
          entityId: "user-shred",
        }),
      })
    );

    // Verify role removal
    expect(mockDb.userRole.deleteMany).toHaveBeenCalledWith({
      where: {
        userId: "user-shred",
        businessId: "tenant-1",
      },
    });
  });

  it("should block non-owners from initiating RTBF", async () => {
    mockDb.userRole.findFirst.mockResolvedValue({ role: "cashier" });
    mockDb.adminUser.findFirst.mockResolvedValue(null);

    const result = await initiateRTBF("tenant-1", "user-shred");

    expect(result.error).toContain("Only Owners or Super Admins");
    expect(mockDb.user.update).not.toHaveBeenCalled();
    expect(mockDb.userRole.deleteMany).not.toHaveBeenCalled();
  });
});
