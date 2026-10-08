import { beforeEach, describe, expect, it, vi } from "vitest";
import { initiateRTBF } from "@/app/actions/rtbf";
import { getPlatformAdmin, requirePlatformAdmin } from "@/lib/auth/platform-admin";

const mocks = vi.hoisted(() => ({
  deleteIdentity: vi.fn(),
  getConvexAuthToken: vi.fn(),
  query: vi.fn(),
  mutation: vi.fn(),
}));

vi.mock("@/lib/auth/platform-admin", () => ({
  getPlatformAdmin: vi.fn(),
  requirePlatformAdmin: vi.fn(),
}));

vi.mock("@/lib/auth/convex-token", () => ({
  getConvexAuthToken: mocks.getConvexAuthToken,
}));

vi.mock("convex/browser", () => ({
  ConvexHttpClient: vi.fn(() => ({
    setAuth: vi.fn(),
    query: mocks.query,
    mutation: mocks.mutation,
  })),
}));

vi.mock("@/lib/adapters/auth/server", () => ({
  clerkClient: vi.fn(async () => ({ users: { deleteUser: mocks.deleteIdentity } })),
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

describe("platform identity removal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_CONVEX_URL = "https://example.convex.cloud";
    vi.mocked(getPlatformAdmin).mockResolvedValue({ userId: "platform-1" } as any);
    vi.mocked(requirePlatformAdmin).mockResolvedValue({ userId: "platform-1" } as any);
    mocks.getConvexAuthToken.mockResolvedValue("test-token");
    mocks.deleteIdentity.mockResolvedValue({});
    mocks.query.mockResolvedValue({});
    mocks.mutation.mockResolvedValue({ success: true });
  });

  it("removes the provider identity, masks local PII, and revokes every membership", async () => {
    const result = await initiateRTBF("tenant-1", "clerk-user-1");

    expect(result).toEqual({ success: true });
    expect(mocks.query).toHaveBeenCalledWith(
      expect.anything(),
      { targetUserId: "clerk-user-1", businessId: "tenant-1" },
    );
    expect(mocks.deleteIdentity).toHaveBeenCalledWith("clerk-user-1");
    expect(mocks.mutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({
        targetUserId: "clerk-user-1",
        businessId: "tenant-1",
        anonymizedEmail: expect.stringMatching(/^deleted_[a-f0-9]{32}@deleted\.deelrxcrm\.com$/),
      }),
    );
  });

  it("blocks non-platform actors before reading or mutating target data", async () => {
    vi.mocked(getPlatformAdmin).mockResolvedValue(null);
    vi.mocked(requirePlatformAdmin).mockRejectedValue(new Error("Platform administrator access required"));

    const result = await initiateRTBF("tenant-1", "clerk-user-1");

    expect(result.error).toContain("requires platform administration");
    expect(mocks.query).not.toHaveBeenCalled();
    expect(mocks.deleteIdentity).not.toHaveBeenCalled();
    expect(mocks.mutation).not.toHaveBeenCalled();
  });

  it("blocks business owners until ownership is explicitly resolved", async () => {
    mocks.query.mockRejectedValue(new Error("OWNER_CONFLICT: Transfer or close every owned business"));

    const result = await initiateRTBF("tenant-1", "clerk-owner-1");

    expect(result.code).toBe("OWNER_CONFLICT");
    expect(mocks.deleteIdentity).not.toHaveBeenCalled();
    expect(mocks.mutation).not.toHaveBeenCalled();
  });

  it("blocks platform accounts and self-removal", async () => {
    mocks.query.mockRejectedValue(new Error("PROTECTED_TARGET: Platform accounts cannot be removed"));
    expect((await initiateRTBF("tenant-1", "other-platform-admin")).code).toBe("PROTECTED_TARGET");
    expect((await initiateRTBF("tenant-1", "platform-1")).code).toBe("INVALID_TARGET");
    expect(mocks.deleteIdentity).not.toHaveBeenCalled();
  });

  it("accepts an already-absent provider identity and finishes local cleanup", async () => {
    mocks.deleteIdentity.mockRejectedValue({ status: 404 });

    expect(await initiateRTBF("tenant-1", "clerk-user-1")).toEqual({ success: true });
    expect(mocks.mutation).toHaveBeenCalledOnce();
  });

  it("stops before local cleanup when provider removal fails", async () => {
    mocks.deleteIdentity.mockRejectedValue({ status: 503 });

    const result = await initiateRTBF("tenant-1", "clerk-user-1");

    expect(result.code).toBe("PROVIDER_FAILURE");
    expect(mocks.mutation).not.toHaveBeenCalled();
  });
});
