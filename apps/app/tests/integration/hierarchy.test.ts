import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateUserRole } from "@/app/actions/user-management";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("Role Hierarchy Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should block managers from assigning super_admin role", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({
            data: { user: { id: "manager-1" } },
            error: null,
          }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { role: "manager" }, error: null }),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const result = await updateUserRole("target-user", "super_admin");

    expect(result.error).toContain("Managers cannot assign Super Admin");
    expect(mockSupabase.update).not.toHaveBeenCalled();
  });

  it("should allow super_admin to update any role", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({
            data: { user: { id: "admin-1" } },
            error: null,
          }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      single: vi
        .fn()
        .mockResolvedValue({ data: { role: "super_admin" }, error: null }),
      update: vi.fn().mockReturnThis(),
      insert: vi.fn().mockResolvedValue({ error: null }),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const result = await updateUserRole("target-user", "manager");

    expect(result.success).toBe(true);
    expect(mockSupabase.update).toHaveBeenCalledWith({ role: "manager" });
  });
});
