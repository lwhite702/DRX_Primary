import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  cookies: vi.fn(),
  headers: vi.fn(),
  getCompletedBusinessId: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`NEXT_REDIRECT:${path}`);
  }),
}));

vi.mock("@/lib/adapters/auth/server", () => ({ auth: mocks.auth }));
vi.mock("@/lib/auth/onboarding-state", () => ({
  getCompletedOnboardingBusinessId: mocks.getCompletedBusinessId,
}));
vi.mock("next/headers", () => ({
  cookies: mocks.cookies,
  headers: mocks.headers,
}));
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }));

import OnboardingLayout from "@/app/onboarding/layout";

describe("OnboardingLayout", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.auth.mockResolvedValue({
      userId: "user_123",
      sessionClaims: { publicMetadata: { onboardingComplete: true } },
    });
    mocks.cookies.mockResolvedValue({
      get: vi.fn(() => ({ value: "true" })),
    });
    mocks.getCompletedBusinessId.mockResolvedValue("business_123");
  });

  it("lets a server-action response commit before redirecting", async () => {
    mocks.headers.mockResolvedValue(new Headers({ "next-action": "action-id" }));
    const child = <div>Onboarding form</div>;

    await expect(OnboardingLayout({ children: child })).resolves.toBe(child);
    expect(mocks.redirect).not.toHaveBeenCalled();
    expect(mocks.getCompletedBusinessId).not.toHaveBeenCalled();
  });

  it("redirects completed users during ordinary navigation", async () => {
    mocks.headers.mockResolvedValue(new Headers());

    await expect(
      OnboardingLayout({ children: <div>Onboarding form</div> }),
    ).rejects.toThrow("NEXT_REDIRECT:/dashboard");
  });
  it("does not let another business's completion cookie skip current tenant setup", async () => {
    mocks.headers.mockResolvedValue(new Headers());
    mocks.getCompletedBusinessId.mockResolvedValue(null);
    const child = <div>Onboarding form</div>;
    await expect(OnboardingLayout({ children: child })).resolves.toBe(child);
    expect(mocks.getCompletedBusinessId).toHaveBeenCalledWith("user_123");
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("does not treat a Convex outage as permission to skip setup", async () => {
    mocks.headers.mockResolvedValue(new Headers());
    mocks.getCompletedBusinessId.mockRejectedValue(new Error("Onboarding status is temporarily unavailable"));
    await expect(OnboardingLayout({ children: <div /> })).rejects.toThrow(/temporarily unavailable/);
    expect(mocks.redirect).not.toHaveBeenCalled();
  });

  it("repairs the routing cookie through reconciliation even when legacy claims say complete", async () => {
    mocks.headers.mockResolvedValue(new Headers());
    mocks.cookies.mockResolvedValue({ get: vi.fn(() => undefined) });
    await expect(OnboardingLayout({ children: <div /> })).rejects.toThrow("NEXT_REDIRECT:/api/onboarding/reconcile");
  });

});
