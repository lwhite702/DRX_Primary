import { describe, it, expect, vi, beforeEach } from "vitest";
import { initiateRTBF } from "@/app/actions/rtbf";

const mockServerClient = {
  auth: {
    getUser: vi.fn(),
    getSession: vi.fn(),
  },
  from: vi.fn(),
};

const mockAdminClient = {
  from: vi.fn(() => ({
    insert: vi.fn().mockResolvedValue({ error: null }),
    delete: vi.fn(() => ({ eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ error: null }) })) })),
    eq: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: null, error: null }) })),
  })),
  auth: {
    admin: {
      updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
    },
  },
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => mockServerClient),
}));

vi.mock("@supabase/supabase-js", () => ({
  createClient: vi.fn(() => mockAdminClient),
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

    mockServerClient.auth.getUser.mockResolvedValue({
      data: { user: { id: "owner-1" } },
      error: null,
    });
    mockServerClient.auth.getSession.mockResolvedValue({
      data: { session: { access_token: "test-token" } },
      error: null,
    });
    mockServerClient.from.mockImplementation((table: string) => {
      if (table === "user_roles") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: "owner" },
                  error: null,
                }),
              })),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      };
    });
  });

  it("should mask user PII and remove roles when initiated by owner", async () => {
    // Start RTBF
    const result = await initiateRTBF("tenant-1", "user-shred");

    expect(result.success).toBe(true);
    expect(mockAdminClient.auth.admin.updateUserById).toHaveBeenCalledWith(
      "user-shred",
      expect.objectContaining({
        user_metadata: expect.objectContaining({
          full_name: "DELETED_USER_RTBF",
        }),
      }),
    );
  });

  it("should block non-owners from initiating RTBF", async () => {
    mockServerClient.from.mockImplementation((table: string) => {
      if (table === "user_roles" || table === "admin_users") {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                single: vi.fn().mockResolvedValue({
                  data: { role: "cashier" },
                  error: null,
                }),
              })),
              single: vi.fn().mockResolvedValue({
                data: { role: "cashier" },
                error: null,
              }),
            })),
          })),
        };
      }
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            single: vi.fn().mockResolvedValue({ data: null, error: null }),
          })),
        })),
      };
    });

    const result = await initiateRTBF("tenant-1", "user-shred");

    expect(result.error).toContain("Only Owners or Super Admins");
  });
});
