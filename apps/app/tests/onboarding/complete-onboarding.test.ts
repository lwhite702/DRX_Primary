import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const redirectMock = vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`);
    (error as Error & { digest?: string }).digest =
      `NEXT_REDIRECT;replace;${url};307;`;
    throw error;
  });

  return {
    authMock: vi.fn(),
    updateUserMock: vi.fn(),
    cookieSetMock: vi.fn(),
    redirectMock,
    provisionBusinessInConvex: vi.fn(),
  };
});

vi.mock("@/lib/adapters/auth/server", () => ({
  auth: mocks.authMock,
  clerkClient: vi.fn(async () => ({
    users: {
      updateUser: mocks.updateUserMock,
    },
  })),
  isAuthBypassEnabled: vi.fn(() => false),
}));

vi.mock("@/lib/convex/onboarding-server", () => ({
  provisionBusinessInConvex: mocks.provisionBusinessInConvex,
}));

vi.mock("next/headers", () => ({
  cookies: vi.fn(async () => ({
    set: mocks.cookieSetMock,
  })),
}));

vi.mock("next/navigation", () => ({
  redirect: mocks.redirectMock,
}));

import {
  completeOnboarding,
  type OnboardingActionState,
} from "@/app/onboarding/_actions";
import { ONBOARDING_COMPLETION_COOKIE } from "@/lib/auth/onboarding-completion";

const initialOnboardingActionState: OnboardingActionState = {
  status: "idle",
  error: null,
};

function form(overrides: Record<string, string> = {}) {
  const formData = new FormData();
  formData.set("businessName", overrides.businessName ?? "Beta Market");
  formData.set("ownerName", overrides.ownerName ?? "Lee Operator");
  formData.set("businessType", overrides.businessType ?? "retail");
  formData.set("locationName", overrides.locationName ?? "Main Store");
  formData.set("city", overrides.city ?? "Albany");
  formData.set("region", overrides.region ?? "NY");
  formData.set("country", overrides.country ?? "US");
  formData.set("role", overrides.role ?? "owner_operator");
  formData.set("teamSize", overrides.teamSize ?? "1-5");
  formData.set("dashboardPreset", overrides.dashboardPreset ?? "checkout");
  formData.set("tooling", overrides.tooling ?? "Spreadsheet and cash drawer");
  formData.set("taxChoice", overrides.taxChoice ?? "later");
  formData.set("taxRate", overrides.taxRate ?? "");
  return formData;
}

describe("completeOnboarding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubEnv("NODE_ENV", "test");

    mocks.authMock.mockResolvedValue({
      userId: "user_123",
      sessionClaims: {
        publicMetadata: {
          existing: "kept",
        },
      },
    });

    mocks.provisionBusinessInConvex.mockResolvedValue({
      businessId: "business_123",
      status: "ONBOARDING_SUCCESS",
    });
  });

  it("creates durable business setup before returning navigation success", async () => {
    await expect(
      completeOnboarding(initialOnboardingActionState, form()),
    ).resolves.toMatchObject({
      status: "success",
      error: null,
      summary: {
        businessName: "Beta Market",
        ownerName: "Lee Operator",
        businessType: "retail",
        locationName: "Main Store · Albany · NY · US",
      },
    });

    expect(mocks.provisionBusinessInConvex).toHaveBeenCalledWith({
      name: "Lee Operator",
      businessName: "Beta Market",
      businessType: "retail",
      clerkOrgId: undefined,
      currency: "USD",
      timezone: "America/New_York",
      collectTax: false,
      taxRateBps: 0,
      setup: {
        locationName: "Main Store",
        city: "Albany",
        region: "NY",
        country: "US",
        tracksInventory: true,
        dashboardPreset: "checkout",
      },
    });
    expect(mocks.updateUserMock).toHaveBeenCalledWith(
      "user_123",
      expect.objectContaining({
        publicMetadata: expect.objectContaining({
          existing: "kept",
          onboardingComplete: true,
        }),
      }),
    );
    expect(mocks.cookieSetMock).toHaveBeenCalledWith(
      ONBOARDING_COMPLETION_COOKIE,
      "true",
      expect.objectContaining({
        httpOnly: true,
        sameSite: "lax",
        path: "/",
      }),
    );
    expect(mocks.redirectMock).not.toHaveBeenCalled();
  });

  it("treats an idempotent Convex retry as successful", async () => {
    mocks.provisionBusinessInConvex.mockResolvedValue({
      businessId: "business_existing",
      status: "ALREADY_ONBOARDED",
    });
    await expect(
      completeOnboarding(
        initialOnboardingActionState,
        form({ businessName: "Updated Market" }),
      ),
    ).resolves.toMatchObject({ status: "success", error: null });

    expect(mocks.provisionBusinessInConvex).toHaveBeenCalledOnce();
  });

  it("persists the configured tax decision and rate", async () => {
    await completeOnboarding(
      initialOnboardingActionState,
      form({ taxChoice: "yes", taxRate: "8.25" }),
    );

    expect(mocks.provisionBusinessInConvex).toHaveBeenCalledWith(
      expect.objectContaining({
        collectTax: true,
        taxRateBps: 825,
      }),
    );
  });

  it("returns a friendly retry state when Convex provisioning is unavailable", async () => {
    mocks.provisionBusinessInConvex.mockRejectedValue(
      new Error("temporary outage"),
    );

    await expect(
      completeOnboarding(initialOnboardingActionState, form()),
    ).resolves.toEqual({
      status: "error",
      error: "We couldn’t create your workspace just yet. Please try again.",
    });

    expect(mocks.updateUserMock).not.toHaveBeenCalled();
  });
});
