import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getServerFlag, ensureServerFlag } from "@/lib/posthog/server-flags";
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

describe("getServerFlag", () => {
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

  it("returns true for a flag with manifest default true when PostHog is unconfigured", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(getServerFlag("feat_dashboard_enabled")).resolves.toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns false for an unknown flag when PostHog is unconfigured", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(getServerFlag("unknown_flag_xyz")).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the value from the PostHog decide endpoint", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ featureFlags: { feat_dashboard_enabled: false } }),
      }),
    );

    await expect(
      getServerFlag("feat_dashboard_enabled", { distinctId: "u1" }),
    ).resolves.toBe(false);
  });

  it("uses options.defaultValue as the explicit fallback", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    // unknown_flag_xyz has no manifest default; options.defaultValue should be used
    await expect(
      getServerFlag("unknown_flag_xyz", { defaultValue: true }),
    ).resolves.toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("options.defaultValue=false overrides the manifest default when provided", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    // feat_dashboard_enabled defaults to true in the manifest, but options.defaultValue=false
    // Since there is no API key, no fetch happens, and options.defaultValue is used as fallback.
    await expect(
      getServerFlag("feat_dashboard_enabled", { defaultValue: false }),
    ).resolves.toBe(false);
  });

  it("respects POSTHOG_FLAG_OVERRIDES_JSON without calling remote", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";
    process.env.POSTHOG_FLAG_OVERRIDES_JSON = JSON.stringify({ feat_dashboard_enabled: false });
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(getServerFlag("feat_dashboard_enabled")).resolves.toBe(false);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("passes personProperties from options to PostHog", async () => {
    process.env.POSTHOG_HOST = "https://posthog.example";
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ featureFlags: {} }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await getServerFlag("feat_dashboard_enabled", {
      distinctId: "u1",
      personProperties: { plan: "enterprise" }, // copy-lint-disable
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.person_properties.plan).toBe("enterprise"); // copy-lint-disable
  });

  it("passes groups from options to PostHog", async () => {
    process.env.POSTHOG_HOST = "https://posthog.example";
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ featureFlags: {} }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await getServerFlag("feat_dashboard_enabled", {
      distinctId: "u1",
      groups: { company: "acme" },
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.groups).toEqual({ company: "acme" });
  });
});

describe("ensureServerFlag", () => {
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

  it("returns the same result as getServerFlag for an enabled flag", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(ensureServerFlag("feat_dashboard_enabled")).resolves.toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("returns the same result as getServerFlag for a disabled flag", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";
    process.env.POSTHOG_FLAG_OVERRIDES_JSON = JSON.stringify({ feat_dashboard_enabled: false });
    vi.stubGlobal("fetch", vi.fn());

    await expect(ensureServerFlag("feat_dashboard_enabled")).resolves.toBe(false);
  });

  it("uses options.defaultValue as the fallback when the flag is unknown", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      ensureServerFlag("unknown_flag_xyz", { defaultValue: true }),
    ).resolves.toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("produces the same result for the same input as getServerFlag", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    vi.stubGlobal(
      "fetch",
      vi.fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ featureFlags: { feat_dashboard_enabled: false } }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ featureFlags: { feat_dashboard_enabled: false } }),
        }),
    );

    const [viaGet, viaEnsure] = await Promise.all([
      getServerFlag("feat_dashboard_enabled", { distinctId: "u-abc" }),
      ensureServerFlag("feat_dashboard_enabled", { distinctId: "u-def" }),
    ]);

    expect(viaGet).toBe(false);
    expect(viaEnsure).toBe(false);
  });
});
