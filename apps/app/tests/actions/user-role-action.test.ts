import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  getCurrentUserRole: vi.fn(),
}));

vi.mock("@/lib/adapters/auth/server", () => ({
  auth: mocks.auth,
}));

vi.mock("@/lib/auth/server-guards", () => ({
  getCurrentUserRole: mocks.getCurrentUserRole,
}));

import { getUserRoleAction } from "@/app/actions/user-role";

describe("getUserRoleAction", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns UNAUTHORIZED when no authenticated user is present", async () => {
    mocks.auth.mockResolvedValue({ userId: null });

    const result = await getUserRoleAction("biz_123");
    expect(result).toEqual({ role: null, error: "UNAUTHORIZED" });
    expect(mocks.getCurrentUserRole).not.toHaveBeenCalled();
  });

  it("returns error on invalid businessId format", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_123" });

    // @ts-expect-error test non-string input
    const result = await getUserRoleAction(12345);
    expect(result).toEqual({ role: null, error: "INVALID_ARGUMENT: Invalid businessId format" });
    expect(mocks.getCurrentUserRole).not.toHaveBeenCalled();
  });

  it("calls getCurrentUserRole when authenticated", async () => {
    mocks.auth.mockResolvedValue({ userId: "user_123" });
    mocks.getCurrentUserRole.mockResolvedValue("OWNER");

    const result = await getUserRoleAction("biz_123");
    expect(result).toEqual({ role: "OWNER" });
    expect(mocks.getCurrentUserRole).toHaveBeenCalledWith("biz_123");
  });
});
