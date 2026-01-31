import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "@/app/api/admin/audit-logs/route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Mock the server client
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("Audit Logs API Integration", () => {
  const mockBusinessId = "test-business-123";
  const mockUserId = "user-123";

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should allow super_admin to fetch all logs with 100 limit", async () => {
    const mockSupabase = {
      auth: {
        getUser: vi
          .fn()
          .mockResolvedValue({
            data: { user: { id: "admin-1", role: "super_admin" } },
            error: null,
          }),
      },
      from: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi
        .fn()
        .mockResolvedValue({ data: [{ id: "log-1" }], error: null }),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const req = new NextRequest("http://localhost:3000/api/admin/audit-logs");
    const res = await GET(req);
    const data = await res.json();

    expect(mockSupabase.from).toHaveBeenCalledWith("system_audit_log");
    expect(mockSupabase.limit).toHaveBeenCalledWith(100);
    expect(data).toHaveLength(1);
    expect(res.status).toBe(200);
  });

  it("should filter logs by business_id for managers", async () => {
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
      order: vi
        .fn()
        .mockResolvedValue({ data: [{ id: "scoped-log" }], error: null }),
    };
    (createClient as any).mockResolvedValue(mockSupabase);

    const req = new NextRequest(
      `http://localhost:3000/api/admin/audit-logs?business_id=${mockBusinessId}`,
    );
    const res = await GET(req);
    const data = await res.json();

    expect(mockSupabase.eq).toHaveBeenCalledWith("business_id", mockBusinessId);
    expect(data[0].id).toBe("scoped-log");
    expect(res.status).toBe(200);
  });
});
