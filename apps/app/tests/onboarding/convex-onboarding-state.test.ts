import { beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ token: vi.fn(), query: vi.fn(), setAuth: vi.fn() }));
vi.mock("@/lib/db", () => { throw new Error("Onboarding state must not load Prisma"); });
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { query = mocks.query; setAuth = mocks.setAuth; } }));
import { getCompletedOnboardingBusinessId } from "@/lib/auth/onboarding-state";
beforeEach(() => { vi.resetAllMocks(); process.env.NEXT_PUBLIC_CONVEX_URL = "https://synthetic.convex.cloud"; mocks.token.mockResolvedValue("synthetic-token"); });
it("uses the signed current membership and verifies the expected operator", async () => {
  mocks.query.mockResolvedValue({ status: "READY", session: { operatorId: "operator-a", businessId: "business-a" } });
  expect(await getCompletedOnboardingBusinessId("operator-a")).toBe("business-a");
  expect(mocks.setAuth).toHaveBeenCalledWith("synthetic-token");
  await expect(getCompletedOnboardingBusinessId("operator-b")).rejects.toThrow(/unavailable/);
});
it("only treats an explicitly unprovisioned account as needing setup", async () => {
  mocks.query.mockResolvedValue({ status: "NEEDS_BUSINESS_ONBOARding" });
  await expect(getCompletedOnboardingBusinessId("operator-a")).rejects.toThrow(/unavailable/);
  mocks.query.mockResolvedValue({ status: "NEEDS_BUSINESS_ONBOARDING" });
  expect(await getCompletedOnboardingBusinessId("operator-a")).toBeNull();
  for (const status of ["INACTIVE", "BUSINESS_MISSING"]) {
    mocks.query.mockResolvedValue({ status });
    await expect(getCompletedOnboardingBusinessId("operator-a")).rejects.toThrow(/unavailable/);
  }
  mocks.query.mockRejectedValue(new Error("private provider payload"));
  await expect(getCompletedOnboardingBusinessId("operator-a")).rejects.toThrow("Onboarding status is temporarily unavailable");
});
