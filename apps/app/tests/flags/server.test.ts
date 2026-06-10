import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBooleanFlag, getFlagValue } from "@/lib/flags/server";
import { clearPostHogFlagCache } from "@/lib/flags/posthog-server-provider";

const ENV_KEYS = [
  "POSTHOG_FLAG_OVERRIDES_JSON",
  "POSTHOG_FLAG_CACHE_TTL_MS",
  "POSTHOG_HOST",
  "NEXT_PUBLIC_POSTHOG_HOST",
  "POSTHOG_PROJECT_API_KEY",
  "NEXT_PUBLIC_POSTHOG_KEY",
] as const;

const savedEnv = new Map<string, string | undefined>();

function resetFlagEnv() {
  savedEnv.clear();
  for (const key of ENV_KEYS) {
    savedEnv.set(key, process.env[key]);
    delete process.env[key];
  }
}

function restoreFlagEnv() {
  for (const [key, value] of savedEnv) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }
}

describe("server flag boundary", () => {
  beforeEach(() => {
    clearPostHogFlagCache();
    resetFlagEnv();
    vi.unstubAllGlobals();
  });

  afterEach(() => {
    clearPostHogFlagCache();
    restoreFlagEnv();
    vi.unstubAllGlobals();
  });

  it("falls back to manifest defaults when PostHog is not configured", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(getBooleanFlag("feat_dashboard_enabled")).resolves.toBe(true);
    await expect(getBooleanFlag("unknown_flag", {}, true)).resolves.toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("uses POSTHOG_FLAG_OVERRIDES_JSON before remote evaluation", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_project_key";
    process.env.POSTHOG_FLAG_OVERRIDES_JSON = JSON.stringify({
      feat_dashboard_enabled: false,
    });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(getBooleanFlag("feat_dashboard_enabled")).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("evaluates boolean flags through the PostHog decide endpoint", async () => {
    process.env.POSTHOG_HOST = "https://posthog.example";
    process.env.POSTHOG_PROJECT_API_KEY = "ph_project_key";

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        featureFlags: {
          feat_dashboard_enabled: false,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      getBooleanFlag("feat_dashboard_enabled", {
        userId: "user_1",
        businessId: "business_1",
        role: "owner",
        request: {
          method: "GET",
          path: "/dashboard",
          userAgent: "vitest",
        },
      }),
    ).resolves.toBe(false);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    expect(fetchSpy).toHaveBeenCalledWith(
      "https://posthog.example/decide/?v=3",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          api_key: "ph_project_key",
          distinct_id: "user_1",
          person_properties: {
            user_id: "user_1",
            business_id: "business_1",
            role: "owner",
            request_method: "GET",
            request_path: "/dashboard",
            user_agent: "vitest",
          },
          groups: {},
        }),
      }),
    );
  });

  it("returns variant values with supplied defaults", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_project_key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          feature_flags: {
            exp_dashboard_layout: "compact",
          },
        }),
      }),
    );

    await expect(
      getFlagValue("exp_dashboard_layout", { distinctId: "user_1" }, "control"),
    ).resolves.toBe("compact");
  });

  it("caches remote evaluations for the configured TTL", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_project_key";
    process.env.POSTHOG_FLAG_CACHE_TTL_MS = "1000";

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        featureFlags: {
          feat_dashboard_enabled: false,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      getBooleanFlag("feat_dashboard_enabled", { distinctId: "user_1" }),
    ).resolves.toBe(false);
    await expect(
      getBooleanFlag("feat_dashboard_enabled", { distinctId: "user_1" }),
    ).resolves.toBe(false);

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });
});
