import { renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  getCurrentBusinessProfile: vi.fn(),
  useIsBypassActive: vi.fn(),
  useOrganizationList: vi.fn(),
  useUser: vi.fn(),
}));

vi.mock("@/lib/adapters/auth/ui", () => ({
  useIsBypassActive: mocks.useIsBypassActive,
  useOrganizationList: mocks.useOrganizationList,
  useUser: mocks.useUser,
}));

vi.mock("@/app/actions/get-current-business", () => ({
  getCurrentBusinessProfile: mocks.getCurrentBusinessProfile,
}));

vi.unmock("@/lib/hooks/use-business");

import { useBusiness } from "@/lib/hooks/use-business";

describe("useBusiness", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useIsBypassActive.mockReturnValue(false);
    mocks.useUser.mockReturnValue({ isLoaded: true });
    mocks.useOrganizationList.mockReturnValue({
      isLoaded: false,
      userMemberships: { data: [] },
      setActive: vi.fn(),
    });
  });

  it("loads the durable business profile without waiting for Clerk organizations", async () => {
    const business = { id: "business-1", businessName: "DeelRX" };
    mocks.getCurrentBusinessProfile.mockResolvedValue(business);

    const { result } = renderHook(() => useBusiness());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(mocks.getCurrentBusinessProfile).toHaveBeenCalledOnce();
    expect(result.current.business).toEqual(business);
    expect(result.current.needsSetup).toBe(false);
  });

  it("does not reopen setup when Clerk memberships are empty", async () => {
    const business = { id: "business-1", businessName: "DeelRX" };
    mocks.useOrganizationList.mockReturnValue({
      isLoaded: true,
      userMemberships: { data: [] },
      setActive: vi.fn(),
    });
    mocks.getCurrentBusinessProfile.mockResolvedValue(business);

    const { result } = renderHook(() => useBusiness());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.needsSetup).toBe(false);
  });

  it("requires setup only when no durable business profile exists", async () => {
    mocks.getCurrentBusinessProfile.mockResolvedValue(null);

    const { result } = renderHook(() => useBusiness());

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.business).toBeNull();
    expect(result.current.needsSetup).toBe(true);
  });
});
