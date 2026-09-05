import { beforeEach, describe, expect, it, vi } from "vitest";
import { initiateRTBF } from "@/app/actions/rtbf";
import { getPlatformAdmin } from "@/lib/auth/platform-admin";

vi.mock("@/lib/auth/platform-admin", () => ({ getPlatformAdmin: vi.fn() }));

const { deleteIdentity, mockDb } = vi.hoisted(() => ({
  deleteIdentity: vi.fn(),
  mockDb: {
    adminUser: { findFirst: vi.fn() },
    businessProfile: { findFirst: vi.fn() },
    userRole: { findFirst: vi.fn(), deleteMany: vi.fn() },
    notification: { deleteMany: vi.fn() },
    systemAuditLog: { create: vi.fn() },
    user: { updateMany: vi.fn() },
    $transaction: vi.fn(),
  },
}));
vi.mock("@/lib/adapters/auth/server", () => ({
  clerkClient: vi.fn(async () => ({ users: { deleteUser: deleteIdentity } })),
}));

vi.mock("@/lib/db", () => ({ db: mockDb }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("platform identity removal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getPlatformAdmin).mockResolvedValue({ userId: "platform-1" });
    mockDb.adminUser.findFirst.mockResolvedValue(null);
    mockDb.businessProfile.findFirst.mockResolvedValue(null);
    mockDb.userRole.findFirst.mockResolvedValue({ id: "membership-1" });
    mockDb.systemAuditLog.create.mockResolvedValue({});
    deleteIdentity.mockResolvedValue({});
    mockDb.$transaction.mockImplementation(async (callback) => callback({
      user: { updateMany: mockDb.user.updateMany },
      userRole: { deleteMany: mockDb.userRole.deleteMany },
      notification: { deleteMany: mockDb.notification.deleteMany },
      systemAuditLog: { create: mockDb.systemAuditLog.create },
    }));
  });

  it("removes the provider identity, masks local PII, and revokes every membership", async () => {
    const result = await initiateRTBF("tenant-1", "clerk-user-1");

    expect(result).toEqual({ success: true });
    expect(deleteIdentity).toHaveBeenCalledWith("clerk-user-1");
    expect(mockDb.user.updateMany).toHaveBeenCalledWith({
      where: { OR: [{ clerkUserId: "clerk-user-1" }, { id: "clerk-user-1" }] },
      data: expect.objectContaining({
        clerkUserId: null,
        name: "DELETED_USER_RTBF",
        email: expect.stringMatching(/^deleted_[a-f0-9]{32}@deleted\.deelrxcrm\.com$/),
        status: "ARCHIVED",
      }),
    });
    expect(mockDb.userRole.deleteMany).toHaveBeenCalledWith({ where: { userId: "clerk-user-1" } });
    expect(mockDb.notification.deleteMany).toHaveBeenCalledWith({ where: { userId: "clerk-user-1" } });
    expect(mockDb.systemAuditLog.create).toHaveBeenCalledTimes(2);
    expect(mockDb.systemAuditLog.create).toHaveBeenLastCalledWith({
      data: expect.objectContaining({ action: "rtbf_completed", entityId: "clerk-user-1" }),
    });
  });

  it("blocks non-platform actors before reading or mutating target data", async () => {
    vi.mocked(getPlatformAdmin).mockResolvedValue(null);

    const result = await initiateRTBF("tenant-1", "clerk-user-1");

    expect(result.error).toContain("requires platform administration");
    expect(mockDb.userRole.findFirst).not.toHaveBeenCalled();
    expect(deleteIdentity).not.toHaveBeenCalled();
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it("blocks business owners until ownership is explicitly resolved", async () => {
    mockDb.businessProfile.findFirst.mockResolvedValue({ id: "owned-business" });

    const result = await initiateRTBF("tenant-1", "clerk-owner-1");

    expect(result.code).toBe("OWNER_CONFLICT");
    expect(deleteIdentity).not.toHaveBeenCalled();
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });

  it("blocks platform accounts and self-removal", async () => {
    mockDb.adminUser.findFirst.mockResolvedValue({ id: "admin-record" });
    expect((await initiateRTBF("tenant-1", "other-platform-admin")).code).toBe("PROTECTED_TARGET");
    expect((await initiateRTBF("tenant-1", "platform-1")).code).toBe("INVALID_TARGET");
    expect(deleteIdentity).not.toHaveBeenCalled();
  });

  it("accepts an already-absent provider identity and finishes local cleanup", async () => {
    deleteIdentity.mockRejectedValue({ status: 404 });

    expect(await initiateRTBF("tenant-1", "clerk-user-1")).toEqual({ success: true });
    expect(mockDb.$transaction).toHaveBeenCalledOnce();
  });

  it("stops before local cleanup when provider removal fails", async () => {
    deleteIdentity.mockRejectedValue({ status: 503 });

    const result = await initiateRTBF("tenant-1", "clerk-user-1");

    expect(result.code).toBe("PROVIDER_FAILURE");
    expect(mockDb.$transaction).not.toHaveBeenCalled();
  });
});
