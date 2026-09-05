import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFeatureFlag, useFeatureFlagValue } from "@/lib/hooks/use-feature-flag";

// Capture the onFeatureFlags callback so tests can trigger it manually
let onFeatureFlagsCallback: (() => void) | null = null;

const mockIsFeatureEnabled = vi.fn((_key?: string, _defaultValue?: boolean) => false);
const mockGetFeatureFlag = vi.fn(
  (_key?: string) => undefined as string | boolean | undefined,
);
const mockOnFeatureFlags = vi.fn((cb: () => void) => {
  onFeatureFlagsCallback = cb;
});
const mockReloadFeatureFlags = vi.fn();

vi.mock("@wrelik/analytics/client", () => ({
  isFeatureEnabled: (key: string, defaultValue?: boolean) =>
    mockIsFeatureEnabled(key, defaultValue),
  getFeatureFlag: (key: string) => mockGetFeatureFlag(key),
  onFeatureFlags: (...args: unknown[]) => mockOnFeatureFlags(...(args as [() => void])),
  reloadFeatureFlags: () => mockReloadFeatureFlags(),
}));

// useBusiness is already mocked globally in tests/setup.ts.
import { useBusiness } from "@/lib/hooks/use-business";
const mockUseBusiness = vi.mocked(useBusiness);

describe("useFeatureFlag", () => {
  beforeEach(() => {
    onFeatureFlagsCallback = null;
    vi.clearAllMocks();
    mockUseBusiness.mockReturnValue({
      business: { id: "test-business-id" } as ReturnType<typeof useBusiness>["business"],
      loading: false,
    } as ReturnType<typeof useBusiness>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns { isEnabled: false, loading: false } when flag is disabled", () => {
    mockIsFeatureEnabled.mockReturnValue(false);

    const { result } = renderHook(() => useFeatureFlag("feat_test_flag"));

    expect(result.current.isEnabled).toBe(false);
    expect(result.current.loading).toBe(false);
  });

  it("returns { isEnabled: true, loading: false } when flag is enabled", () => {
    mockIsFeatureEnabled.mockReturnValue(true);

    const { result } = renderHook(() => useFeatureFlag("feat_enabled_flag"));

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it("delegates to useFlag with false as the default value", () => {
    mockIsFeatureEnabled.mockReturnValue(false);

    renderHook(() => useFeatureFlag("feat_test_flag"));

    // useFlag passes (key, false) to isFeatureEnabled
    expect(mockIsFeatureEnabled).toHaveBeenCalledWith("feat_test_flag", false);
  });

  it("passes the flag key through to the underlying analytics call", () => {
    mockIsFeatureEnabled.mockReturnValue(false);

    renderHook(() => useFeatureFlag("ops_credit_kill_switch"));

    expect(mockIsFeatureEnabled).toHaveBeenCalledWith("ops_credit_kill_switch", false);
  });

  it("updates isEnabled reactively when feature flags reload", () => {
    mockIsFeatureEnabled
      .mockReturnValueOnce(false) // initial
      .mockReturnValueOnce(true);  // after reload

    const { result } = renderHook(() => useFeatureFlag("feat_test_flag"));

    expect(result.current.isEnabled).toBe(false);

    act(() => {
      onFeatureFlagsCallback?.();
    });

    expect(result.current.isEnabled).toBe(true);
  });

  it("calls reloadFeatureFlags when business context is available", () => {
    renderHook(() => useFeatureFlag("feat_test_flag"));

    expect(mockReloadFeatureFlags).toHaveBeenCalledTimes(1);
  });
});

describe("useFeatureFlagValue", () => {
  beforeEach(() => {
    onFeatureFlagsCallback = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("returns the current flag value from the analytics library", () => {
    mockGetFeatureFlag.mockReturnValue("variant-a");

    const { result } = renderHook(() => useFeatureFlagValue("exp_test_flag"));

    expect(result.current.value).toBe("variant-a");
    expect(result.current.loading).toBe(false);
  });

  it("returns undefined value when getFeatureFlag has no value for the key", () => {
    mockGetFeatureFlag.mockReturnValue(undefined);

    const { result } = renderHook(() => useFeatureFlagValue("exp_missing_flag"));

    expect(result.current.value).toBeUndefined();
    expect(result.current.loading).toBe(false);
  });

  it("passes the flag key through to getFeatureFlag", () => {
    mockGetFeatureFlag.mockReturnValue("control");

    renderHook(() => useFeatureFlagValue("exp_checkout_flow"));

    expect(mockGetFeatureFlag).toHaveBeenCalledWith("exp_checkout_flow");
  });

  it("updates value reactively when feature flags reload", () => {
    mockGetFeatureFlag
      .mockReturnValueOnce("v1") // initial
      .mockReturnValueOnce("v2");  // after reload

    const { result } = renderHook(() => useFeatureFlagValue("exp_test_flag"));

    expect(result.current.value).toBe("v1");

    act(() => {
      onFeatureFlagsCallback?.();
    });

    expect(result.current.value).toBe("v2");
  });

  it("supports boolean flag values returned from analytics", () => {
    mockGetFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useFeatureFlagValue("feat_boolean_flag"));

    expect(result.current.value).toBe(true);
  });
});
