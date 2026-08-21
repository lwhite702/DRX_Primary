import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

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

import { BusinessProvider, useBusiness } from "@/lib/hooks/use-business";

const wrapper = ({ children }: { children: ReactNode }) => (
  <BusinessProvider>{children}</BusinessProvider>
);

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

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("loads the durable business profile without waiting for Clerk organizations", async () => {
    const business = { id: "business-1", businessName: "DeelRX" };
    mocks.getCurrentBusinessProfile.mockResolvedValue(business);

    const { result } = renderHook(() => useBusiness(), { wrapper });

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

    const { result } = renderHook(() => useBusiness(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.needsSetup).toBe(false);
  });

  it("requires setup only when no durable business profile exists", async () => {
    mocks.getCurrentBusinessProfile.mockResolvedValue(null);

    const { result } = renderHook(() => useBusiness(), { wrapper });

    await waitFor(() => expect(result.current.loading).toBe(false));

    expect(result.current.business).toBeNull();
    expect(result.current.needsSetup).toBe(true);
  });

  it("shares one profile request across consumers", async () => {
    mocks.getCurrentBusinessProfile.mockResolvedValue({
      id: "business-1",
      businessName: "DeelRX",
    });

    const { result } = renderHook(
      () => ({ first: useBusiness(), second: useBusiness() }),
      { wrapper },
    );

    await waitFor(() => expect(result.current.first.loading).toBe(false));

    expect(result.current.second.business?.id).toBe("business-1");
    expect(mocks.getCurrentBusinessProfile).toHaveBeenCalledOnce();
  });

  it("retains the last good profile while a refresh is pending", async () => {
    let resolveRefresh: ((value: unknown) => void) | undefined;
    mocks.getCurrentBusinessProfile
      .mockResolvedValueOnce({ id: "business-1", businessName: "DeelRX" })
      .mockImplementationOnce(
        () =>
          new Promise((resolve) => {
            resolveRefresh = resolve;
          }),
      );

    const { result } = renderHook(() => useBusiness(), { wrapper });
    await waitFor(() => expect(result.current.status).toBe("success"));

    const refreshPromise = result.current.refreshBusiness();
    await waitFor(() => expect(result.current.refreshing).toBe(true));
    expect(result.current.business?.id).toBe("business-1");

    resolveRefresh?.({ id: "business-1", businessName: "Updated" });
    await refreshPromise;
    await waitFor(() => expect(result.current.refreshing).toBe(false));
    expect(result.current.business?.businessName).toBe("Updated");
  });

  it("clears the prior tenant before switching businesses", async () => {
    let finishActivation: (() => void) | undefined;
    const setActive = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishActivation = resolve;
        }),
    );
    mocks.useOrganizationList.mockReturnValue({
      isLoaded: true,
      userMemberships: { data: [] },
      setActive,
    });
    mocks.getCurrentBusinessProfile
      .mockResolvedValueOnce({ id: "business-1", businessName: "First" })
      .mockResolvedValueOnce({ id: "business-2", businessName: "Second" });

    const { result } = renderHook(() => useBusiness(), { wrapper });
    await waitFor(() => expect(result.current.business?.id).toBe("business-1"));

    act(() => result.current.switchBusiness("organization-2"));

    expect(result.current.business).toBeNull();
    expect(result.current.loading).toBe(true);
    await waitFor(() => expect(setActive).toHaveBeenCalledOnce());
    act(() => finishActivation?.());
    await waitFor(() => expect(result.current.business?.id).toBe("business-2"));
    expect(setActive).toHaveBeenCalledWith({ organization: "organization-2" });
  });

  it("does not restore the prior tenant when switching fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    mocks.useOrganizationList.mockReturnValue({
      isLoaded: true,
      userMemberships: { data: [] },
      setActive: vi.fn().mockRejectedValue(new Error("activation failed")),
    });
    mocks.getCurrentBusinessProfile.mockResolvedValue({
      id: "business-1",
      businessName: "First",
    });

    const { result } = renderHook(() => useBusiness(), { wrapper });
    await waitFor(() => expect(result.current.business?.id).toBe("business-1"));

    act(() => result.current.switchBusiness("organization-2"));

    await waitFor(() => expect(result.current.status).toBe("error"));
    expect(result.current.business).toBeNull();
    expect(result.current.error).toMatch(/could not switch/i);
  });

  it("serializes rapid business switches so the latest Clerk organization wins", async () => {
    const activations = new Map<string, () => void>();
    const setActive = vi.fn(
      ({ organization }: { organization: string }) =>
        new Promise<void>((resolve) => {
          activations.set(organization, resolve);
        }),
    );
    mocks.useOrganizationList.mockReturnValue({
      isLoaded: true,
      userMemberships: { data: [] },
      setActive,
    });
    mocks.getCurrentBusinessProfile
      .mockResolvedValueOnce({ id: "business-1", businessName: "First" })
      .mockResolvedValueOnce({ id: "business-3", businessName: "Third" });

    const { result } = renderHook(() => useBusiness(), { wrapper });
    await waitFor(() => expect(result.current.business?.id).toBe("business-1"));

    act(() => result.current.switchBusiness("organization-2"));
    await waitFor(() => expect(setActive).toHaveBeenCalledTimes(1));
    act(() => result.current.switchBusiness("organization-3"));
    expect(setActive).toHaveBeenCalledTimes(1);

    await act(async () => {
      activations.get("organization-2")?.();
    });
    await waitFor(() =>
      expect(setActive).toHaveBeenLastCalledWith({
        organization: "organization-3",
      }),
    );

    await act(async () => {
      activations.get("organization-3")?.();
    });
    await waitFor(() => expect(result.current.business?.id).toBe("business-3"));
    expect(mocks.getCurrentBusinessProfile).toHaveBeenCalledTimes(2);
  });
});
