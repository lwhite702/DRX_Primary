import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  refreshRole: vi.fn(),
  useIsBypassActive: vi.fn(),
  useUserRole: vi.fn(),
}));

vi.mock("@/lib/adapters/auth/ui", () => ({
  useIsBypassActive: mocks.useIsBypassActive,
}));

vi.mock("@/lib/hooks/use-user-role", () => ({
  useUserRole: mocks.useUserRole,
}));

// Production has no Supabase browser credentials. Import the real compatibility
// module so this test would catch any permission-hook regression that constructs it.
vi.unmock("@/lib/data/client/supabase-client");

import { usePermission } from "@/lib/hooks/use-permission";

describe("usePermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.useIsBypassActive.mockReturnValue(false);
    mocks.useUserRole.mockReturnValue({
      role: "owner",
      roleBusinessId: "business-1",
      loading: false,
      refreshRole: mocks.refreshRole,
    });
  });

  it("derives permissions from the current role without a Supabase client", () => {
    const { result } = renderHook(() => usePermission("business-1"));

    expect(result.current.loading).toBe(false);
    expect(result.current.hasPermission("sales.create")).toBe(true);
    expect(result.current.hasPermission("settings.configure_pos")).toBe(true);
    expect(result.current.hasPermission("system.manage")).toBe(true);
    expect(result.current.refreshPermissions).toBe(mocks.refreshRole);
  });

  it("keeps permissions hidden while the role is loading", () => {
    mocks.useUserRole.mockReturnValue({
      role: null,
      roleBusinessId: "business-1",
      loading: true,
      refreshRole: mocks.refreshRole,
    });

    const { result } = renderHook(() => usePermission("business-1"));

    expect(result.current.loading).toBe(true);
    expect(result.current.permissions).toEqual([]);
  });

  it("preserves unrestricted local bypass behavior", () => {
    mocks.useIsBypassActive.mockReturnValue(true);

    const { result } = renderHook(() => usePermission(undefined));

    expect(result.current.loading).toBe(false);
    expect(result.current.hasPermission("any.permission")).toBe(true);
  });

  it("does not retain permissions while switching businesses", () => {
    const { result, rerender } = renderHook(
      ({ businessId }) => usePermission(businessId),
      { initialProps: { businessId: "business-1" } },
    );

    expect(result.current.hasPermission("settings.configure_pos")).toBe(true);

    rerender({ businessId: "business-2" });

    expect(result.current.loading).toBe(true);
    expect(result.current.permissions).toEqual([]);

    mocks.useUserRole.mockReturnValue({
      role: "cashier",
      roleBusinessId: "business-2",
      loading: false,
      refreshRole: mocks.refreshRole,
    });
    rerender({ businessId: "business-2" });

    expect(result.current.loading).toBe(false);
    expect(result.current.hasPermission("sales.create")).toBe(true);
    expect(result.current.hasPermission("settings.configure_pos")).toBe(false);
  });

  it("keeps permissions empty until a business context is available", () => {
    mocks.useUserRole.mockReturnValue({
      role: "owner",
      roleBusinessId: undefined,
      loading: false,
      refreshRole: mocks.refreshRole,
    });

    const { result } = renderHook(() => usePermission(undefined));

    expect(result.current.loading).toBe(true);
    expect(result.current.permissions).toEqual([]);
    expect(result.current.hasPermission("system.manage")).toBe(false);
  });
});
