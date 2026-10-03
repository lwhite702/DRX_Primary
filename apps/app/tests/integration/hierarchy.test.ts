import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateUserRole } from "@/app/actions/user-management";

const m = vi.hoisted(() => ({
  grant: vi.fn(),
  mutation: vi.fn(),
  getConvexAuthToken: vi.fn(),
}));

vi.mock("@/lib/auth/platform-admin", () => ({
  requirePlatformAdmin: m.grant,
}));

vi.mock("@/lib/auth/convex-token", () => ({
  getConvexAuthToken: m.getConvexAuthToken,
}));

vi.mock("convex/browser", () => ({
  ConvexHttpClient: vi.fn(() => ({
    setAuth: vi.fn(),
    mutation: m.mutation,
  })),
}));

describe("Platform and business role separation integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";
    m.getConvexAuthToken.mockResolvedValue("test-convex-token");
    m.mutation.mockResolvedValue({ success: true });
  });

  it("blocks business managers from global role changes", async () => {
    m.grant.mockRejectedValue(new Error("Platform administrator access required"));
    expect((await updateUserRole("target", "manager", "tenant")).error).toBeTruthy();
    expect(m.mutation).not.toHaveBeenCalled();
  });

  it("allows explicit platform authority to update only a selected tenant role", async () => {
    m.grant.mockResolvedValue({ userId: "platform" });
    expect((await updateUserRole("target", "manager", "tenant")).success).toBe(true);
    expect(m.mutation).toHaveBeenCalledWith(
      expect.anything(),
      { targetUserId: "target", businessId: "tenant", role: "manager" },
    );
  });

  it("never grants platform access through business role management", async () => {
    m.grant.mockResolvedValue({ userId: "platform" });
    expect((await updateUserRole("target", "super_admin", "tenant")).error).toBeTruthy();
    expect(m.mutation).not.toHaveBeenCalled();
  });
});
