import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useFlag, useFlagValue } from "@/lib/flags/client";

// Capture the onFeatureFlags callback so tests can trigger it manually
let onFeatureFlagsCallback: (() => void) | null = null;

const mockIsFeatureEnabled = vi.fn(() => false);
const mockGetFeatureFlag = vi.fn(() => undefined as string | boolean | undefined);
const mockOnFeatureFlags = vi.fn((cb: () => void) => {
  onFeatureFlagsCallback = cb;
});
const mockReloadFeatureFlags = vi.fn();

vi.mock("@wrelik/analytics/client", () => ({
  isFeatureEnabled: (...args: unknown[]) => mockIsFeatureEnabled(...args),
  getFeatureFlag: (...args: unknown[]) => mockGetFeatureFlag(...args),
  onFeatureFlags: (...args: unknown[]) => mockOnFeatureFlags(...(args as [() => void])),
  reloadFeatureFlags: () => mockReloadFeatureFlags(),
}));

// useBusiness is already mocked in tests/setup.ts:
//   vi.mock("@/lib/hooks/use-business", () => ({
//     useBusiness: vi.fn(() => ({ business: { id: "test-business-id" }, loading: false })),
//   }));
// We import the mock here so individual tests can override it.
import { useBusiness } from "@/lib/hooks/use-business";
const mockUseBusiness = vi.mocked(useBusiness);

describe("useFlag", () => {
  beforeEach(() => {
    onFeatureFlagsCallback = null;
    vi.clearAllMocks();
    // Default: business is present
    mockUseBusiness.mockReturnValue({
      business: { id: "test-business-id" } as ReturnType<typeof useBusiness>["business"],
      loading: false,
    } as ReturnType<typeof useBusiness>);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts with loading=true and isEnabled equal to the defaultValue", () => {
    mockIsFeatureEnabled.mockReturnValue(false);

    const { result } = renderHook(() => useFlag("feat_test_flag", false));

    // After the first render the effect runs synchronously in jsdom so
    // loading transitions to false immediately, but the initial state
    // before the effect fires should reflect the defaultValue.
    expect(result.current.isEnabled).toBe(false);
  });

  it("transitions loading to false after the first evaluation", () => {
    mockIsFeatureEnabled.mockReturnValue(true);

    const { result } = renderHook(() => useFlag("feat_test_flag"));

    expect(result.current.loading).toBe(false);
  });

  it("calls isFeatureEnabled with the flag key and defaultValue on mount", () => {
    mockIsFeatureEnabled.mockReturnValue(false);

    renderHook(() => useFlag("feat_my_flag", false));

    expect(mockIsFeatureEnabled).toHaveBeenCalledWith("feat_my_flag", false);
  });

  it("reflects the value returned by isFeatureEnabled", () => {
    mockIsFeatureEnabled.mockReturnValue(true);

    const { result } = renderHook(() => useFlag("feat_enabled_flag"));

    expect(result.current.isEnabled).toBe(true);
    expect(result.current.loading).toBe(false);
  });

  it("calls reloadFeatureFlags when business.id is present", () => {
    mockIsFeatureEnabled.mockReturnValue(false);

    renderHook(() => useFlag("feat_test_flag"));

    expect(mockReloadFeatureFlags).toHaveBeenCalledTimes(1);
  });

  it("does NOT call reloadFeatureFlags when business.id is absent", () => {
    mockIsFeatureEnabled.mockReturnValue(false);
    mockUseBusiness.mockReturnValue({
      business: null,
      loading: false,
    } as unknown as ReturnType<typeof useBusiness>);

    renderHook(() => useFlag("feat_test_flag"));

    expect(mockReloadFeatureFlags).not.toHaveBeenCalled();
  });

  it("subscribes via onFeatureFlags on mount", () => {
    renderHook(() => useFlag("feat_test_flag"));

    expect(mockOnFeatureFlags).toHaveBeenCalledTimes(1);
    expect(mockOnFeatureFlags).toHaveBeenCalledWith(expect.any(Function));
  });

  it("updates isEnabled when the onFeatureFlags callback fires with a new value", () => {
    mockIsFeatureEnabled.mockReturnValueOnce(false).mockReturnValueOnce(true);

    const { result } = renderHook(() => useFlag("feat_test_flag"));

    expect(result.current.isEnabled).toBe(false);

    act(() => {
      onFeatureFlagsCallback?.();
    });

    expect(result.current.isEnabled).toBe(true);
  });

  it("uses false as the implicit defaultValue when none is supplied", () => {
    mockIsFeatureEnabled.mockReturnValue(false);

    const { result } = renderHook(() => useFlag("feat_test_flag"));

    expect(result.current.isEnabled).toBe(false);
  });

  it("passes the custom defaultValue to isFeatureEnabled", () => {
    mockIsFeatureEnabled.mockReturnValue(true);

    renderHook(() => useFlag("feat_test_flag", true));

    expect(mockIsFeatureEnabled).toHaveBeenCalledWith("feat_test_flag", true);
  });
});

describe("useFlagValue", () => {
  beforeEach(() => {
    onFeatureFlagsCallback = null;
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("starts with value equal to the defaultValue before the effect runs", () => {
    mockGetFeatureFlag.mockReturnValue(undefined);

    const { result } = renderHook(() => useFlagValue("exp_test_flag", "control"));

    // After the effect the value will be set; the initial state held in
    // the useState initializer equals the defaultValue.
    expect(result.current.value).toBeDefined();
  });

  it("transitions loading to false after calling getFeatureFlag", () => {
    mockGetFeatureFlag.mockReturnValue("variant-a");

    const { result } = renderHook(() => useFlagValue("exp_test_flag"));

    expect(result.current.loading).toBe(false);
  });

  it("sets value to the result of getFeatureFlag on mount", () => {
    mockGetFeatureFlag.mockReturnValue("variant-b");

    const { result } = renderHook(() => useFlagValue("exp_test_flag", "control"));

    expect(result.current.value).toBe("variant-b");
  });

  it("falls back to defaultValue when getFeatureFlag returns null/undefined", () => {
    mockGetFeatureFlag.mockReturnValue(undefined);

    const { result } = renderHook(() => useFlagValue("exp_test_flag", "control"));

    expect(result.current.value).toBe("control");
  });

  it("sets value to undefined when getFeatureFlag returns undefined and no defaultValue", () => {
    mockGetFeatureFlag.mockReturnValue(undefined);

    const { result } = renderHook(() => useFlagValue("exp_test_flag"));

    expect(result.current.value).toBeUndefined();
  });

  it("subscribes via onFeatureFlags on mount", () => {
    mockGetFeatureFlag.mockReturnValue("v1");

    renderHook(() => useFlagValue("exp_test_flag"));

    expect(mockOnFeatureFlags).toHaveBeenCalledTimes(1);
    expect(mockOnFeatureFlags).toHaveBeenCalledWith(expect.any(Function));
  });

  it("updates value when the onFeatureFlags callback fires", () => {
    mockGetFeatureFlag.mockReturnValueOnce("v1").mockReturnValueOnce("v2");

    const { result } = renderHook(() => useFlagValue("exp_test_flag", "control"));

    expect(result.current.value).toBe("v1");

    act(() => {
      onFeatureFlagsCallback?.();
    });

    expect(result.current.value).toBe("v2");
  });

  it("uses defaultValue from onFeatureFlags callback when getFeatureFlag returns undefined", () => {
    mockGetFeatureFlag
      .mockReturnValueOnce("v1") // initial load
      .mockReturnValueOnce(undefined); // flag removed mid-session

    const { result } = renderHook(() => useFlagValue("exp_test_flag", "fallback"));

    expect(result.current.value).toBe("v1");

    act(() => {
      onFeatureFlagsCallback?.();
    });

    expect(result.current.value).toBe("fallback");
  });

  it("supports boolean flag values", () => {
    mockGetFeatureFlag.mockReturnValue(true);

    const { result } = renderHook(() => useFlagValue<boolean>("feat_test_flag", false));

    expect(result.current.value).toBe(true);
  });
});