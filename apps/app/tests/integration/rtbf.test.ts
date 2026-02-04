import { describe, it, expect, vi, beforeEach } from "vitest";
import { initiateRTBF } from "@/app/actions/rtbf";
import { db } from "@wrelik/db";

// Mock standard db client
vi.mock("@wrelik/db", () => ({
  db: {},
}));

// Define shared mocks
const mockAdminAuth = {
  admin: {
    updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
  },
};
const mockAdminDbInstance = {
  businessProfile: {
    findMany: vi.fn().mockResolvedValue([]),
  },
};
const mockAdminDb = {
  findMany: vi.fn().mockResolvedValue([]),
  update: vi.fn().mockResolvedValue({}),
};

describe("RTBF Privacy Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "http://test.supabase.co";
    process.env.SUPABASE_SERVICE_ROLE_KEY = "test-key";

    // Mock global fetch
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ success: true }),
    });
  });

  it("should mask user PII and remove roles when initiated by owner", async () => {
    const mockDb = {
      businessProfile: {
        findMany: vi.fn().mockResolvedValue([
          { id: "tenant-1", owner_id: "owner-1" },
        ]),
      },
    };
    (db as any).mockReturnValue(mockDb);

    // Start RTBF
    const result = await initiateRTBF("tenant-1", "user-shred");

    expect(result.success).toBe(true);
    expect(mockAdminAuth.admin.updateUserById).toHaveBeenCalledWith(
      "user-shred",
      expect.objectContaining({
        user_metadata: expect.objectContaining({
          full_name: "DELETED_USER_RTBF",
        }),
      }),
    );
    expect(mockAdminDb.findMany).toHaveBeenCalled();
  });

  it("should block non-owners from initiating RTBF", async () => {
    const result = await initiateRTBF("tenant-1", "user-shred");

    expect(result.error).toContain("Only Owners or Super Admins");
  });
});
