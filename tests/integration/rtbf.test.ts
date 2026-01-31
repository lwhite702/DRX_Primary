import { describe, it, expect, vi, beforeEach } from "vitest";
import { initiateRTBF } from "@/app/actions/rtbf";
import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";

// Mock the standard server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

// Define shared mocks
const mockAdminAuth = {
  admin: {
    updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
  },
};
const mockAdminSupabaseInstance = {
  from: vi.fn().mockReturnThis(), // `from()` returns the instance itself for chaining
  insert: vi.fn().mockResolvedValue({ error: null }),
  delete: vi.fn().mockReturnThis(),
  eq: vi.fn().mockReturnThis(),
  auth: mockAdminAuth,
};

// Mock the admin client (supabase-js)
vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockAdminSupabaseInstance),
}));

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
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "owner-1" } },
          error: null,
        }),
        getSession: vi.fn().mockResolvedValue({
          data: { session: { access_token: "token" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { role: "owner" }, error: null }),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    // This will now use the mocked version
    const mockAdminSupabase = (createAdminClient as any)();

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
    expect(mockAdminSupabaseInstance.delete).toHaveBeenCalled();
  });

  it("should block non-owners from initiating RTBF", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi.fn().mockResolvedValue({
          data: { user: { id: "cashier-1" } },
          error: null,
        }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { role: "cashier" }, error: null }),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const result = await initiateRTBF("tenant-1", "user-shred");

    expect(result.error).toContain("Only Owners or Super Admins");
  });
});
