import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ auth: vi.fn(), getToken: vi.fn() }));
vi.mock("@/lib/adapters/auth/server", () => ({ auth: mocks.auth }));

import { getConvexAuthToken } from "@/lib/auth/convex-token";

describe("server Clerk/Convex token selection", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  it.each([
    { aud: "convex", integrated: true },
    { aud: ["other", "convex"], integrated: true },
    { aud: "other", integrated: false },
    { aud: ["other"], integrated: false },
    { aud: undefined, integrated: false },
  ])("selects the verified audience path for $aud", async ({ aud, integrated }) => {
    mocks.auth.mockResolvedValue({
      userId: "synthetic-user", sessionClaims: { aud }, getToken: mocks.getToken,
    });
    mocks.getToken.mockResolvedValue("synthetic-token");
    expect(await getConvexAuthToken()).toBe("synthetic-token");
    expect(mocks.getToken.mock.calls).toEqual(integrated ? [[]] : [[{ template: "convex" }]]);
  });

  it("does not request a token without an authenticated user", async () => {
    mocks.auth.mockResolvedValue({ userId: null, sessionClaims: { aud: "convex" }, getToken: mocks.getToken });
    expect(await getConvexAuthToken()).toBeNull();
    expect(mocks.getToken).not.toHaveBeenCalled();
  });

  it("does not fall back to a different token after a provider failure", async () => {
    mocks.auth.mockResolvedValue({ userId: "synthetic-user", sessionClaims: { aud: "convex" }, getToken: mocks.getToken });
    mocks.getToken.mockRejectedValue(new Error("synthetic-private-provider-detail"));
    await expect(getConvexAuthToken()).rejects.toThrow("Convex authentication is temporarily unavailable");
    expect(mocks.getToken.mock.calls).toEqual([[]]);
  });

  it("preserves a missing-token result", async () => {
    mocks.auth.mockResolvedValue({ userId: "synthetic-user", getToken: mocks.getToken });
    mocks.getToken.mockResolvedValue(null);
    expect(await getConvexAuthToken()).toBeNull();
  });
});
