import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => {
  const redirectMock = vi.fn((url: string) => {
    const error = new Error(`NEXT_REDIRECT:${url}`);
    (error as Error & { digest?: string }).digest = `NEXT_REDIRECT;replace;${url};307;`;
    throw error;
  });

  return {
    authMock: vi.fn(),
    updateUserMock: vi.fn(),
    cookieSetMock: vi.fn(),
    redirectMock,
    dbMock: {
      businessProfile: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      businessSettings: {
        findUnique: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
      userRole: {
        findFirst: vi.fn(),
        create: vi.fn(),
        update: vi.fn(),
      },
    },
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

vi.mock("@/lib/db", () => ({
  db: mocks.dbMock,
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
  formData.set("role", overrides.role ?? "owner_operator");
  formData.set("teamSize", overrides.teamSize ?? "1-5");
  formData.set("dashboardPreset", overrides.dashboardPreset ?? "checkout");
  formData.set("tooling", overrides.tooling ?? "Spreadsheet and cash drawer");
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

    mocks.dbMock.businessProfile.findFirst.mockResolvedValue(null);
    mocks.dbMock.businessProfile.create.mockResolvedValue({ id: "business_123" });
    mocks.dbMock.businessProfile.update.mockResolvedValue({ id: "business_existing" });
    mocks.dbMock.businessSettings.findUnique.mockResolvedValue(null);
    mocks.dbMock.userRole.findFirst.mockResolvedValue(null);
  });

  it("creates durable business setup before returning navigation success", async () => {
    await expect(
      completeOnboarding(initialOnboardingActionState, form()),
    ).resolves.toEqual({ status: "success", error: null });

    expect(mocks.dbMock.businessProfile.create).toHaveBeenCalledWith({
      data: {
        businessName: "Beta Market",
        businessType: "other",
        ownerId: "user_123",
        isActive: true,
      },
      select: { id: true },
    });
    expect(mocks.dbMock.businessSettings.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        businessId: "business_123",
        currency: "USD",
        timezone: "America/New_York",
        settingsData: expect.objectContaining({
          onboarding_completed: true,
          dashboard_preset: "checkout",
          role: "owner_operator",
          team_size: "1-5",
          tooling: "Spreadsheet and cash drawer",
        }),
      }),
    });
    expect(mocks.dbMock.userRole.create).toHaveBeenCalledWith({
      data: {
        businessId: "business_123",
        userId: "user_123",
        role: "owner",
        permissions: { all: true },
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

  it("reuses an existing active owner business and updates setup state", async () => {
    mocks.dbMock.businessProfile.findFirst.mockResolvedValue({ id: "business_existing" });
    mocks.dbMock.businessSettings.findUnique.mockResolvedValue({
      id: "settings_existing",
      settingsData: {
        default_unit: "g",
      },
    });
    mocks.dbMock.userRole.findFirst.mockResolvedValue({ id: "role_existing" });

    await expect(
      completeOnboarding(
        initialOnboardingActionState,
        form({ businessName: "Updated Market" }),
      ),
    ).resolves.toEqual({ status: "success", error: null });

    expect(mocks.dbMock.businessProfile.create).not.toHaveBeenCalled();
    expect(mocks.dbMock.businessProfile.update).toHaveBeenCalledWith({
      where: { id: "business_existing" },
      data: {
        businessName: "Updated Market",
        businessType: "other",
        isActive: true,
      },
      select: { id: true },
    });
    expect(mocks.dbMock.businessSettings.update).toHaveBeenCalledWith({
      where: { id: "settings_existing" },
      data: {
        currency: "USD",
        timezone: "America/New_York",
        collectTax: false,
        settingsData: expect.objectContaining({
          default_unit: "g",
          onboarding_completed: true,
        }),
      },
    });
    expect(mocks.dbMock.userRole.create).not.toHaveBeenCalled();
    expect(mocks.dbMock.userRole.update).toHaveBeenCalledWith({
      where: { id: "role_existing" },
      data: {
        role: "owner",
        permissions: { all: true },
      },
    });
  });
});
