import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getBooleanFlag, ensureFlag, getFlagValue } from "@/lib/flags/server";
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

  it("uses NEXT_PUBLIC_POSTHOG_KEY when POSTHOG_PROJECT_API_KEY is absent", async () => {
    process.env.NEXT_PUBLIC_POSTHOG_KEY = "ph_public_key";
    process.env.NEXT_PUBLIC_POSTHOG_HOST = "https://eu.posthog.example";

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ featureFlags: { feat_dashboard_enabled: false } }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      getBooleanFlag("feat_dashboard_enabled", { distinctId: "u1" }),
    ).resolves.toBe(false);

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://eu.posthog.example/decide/?v=3",
      expect.objectContaining({
        body: expect.stringContaining('"api_key":"ph_public_key"'),
      }),
    );
  });

  it("strips trailing slash from POSTHOG_HOST when building the URL", async () => {
    process.env.POSTHOG_HOST = "https://posthog.example/";
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ featureFlags: {} }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await getBooleanFlag("feat_dashboard_enabled", { distinctId: "u1" });

    expect(fetchSpy).toHaveBeenCalledWith(
      "https://posthog.example/decide/?v=3",
      expect.anything(),
    );
  });

  it("falls back to default when the PostHog response is not ok", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false }),
    );

    await expect(getBooleanFlag("feat_dashboard_enabled")).resolves.toBe(true);
    await expect(getBooleanFlag("unknown_flag", {}, false)).resolves.toBe(false);
  });

  it("falls back to default when fetch throws", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network error")),
    );

    await expect(getBooleanFlag("feat_dashboard_enabled")).resolves.toBe(true);
  });

  it("ignores invalid POSTHOG_FLAG_OVERRIDES_JSON and uses remote value", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";
    process.env.POSTHOG_FLAG_OVERRIDES_JSON = "{ not valid json }}}";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ featureFlags: { feat_dashboard_enabled: false } }),
      }),
    );

    await expect(getBooleanFlag("feat_dashboard_enabled")).resolves.toBe(false);
  });

  it("filters non-boolean values out of POSTHOG_FLAG_OVERRIDES_JSON", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";
    process.env.POSTHOG_FLAG_OVERRIDES_JSON = JSON.stringify({
      feat_dashboard_enabled: "not-a-boolean",
      feat_inventory_enabled: 1,
    });

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        featureFlags: {
          feat_dashboard_enabled: false,
          feat_inventory_enabled: false,
        },
      }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    // String and number overrides are filtered, so remote value is used
    await expect(getBooleanFlag("feat_dashboard_enabled", { distinctId: "u1" })).resolves.toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("uses distinctId directly when explicitly provided in context", async () => {
    process.env.POSTHOG_HOST = "https://posthog.example";
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ featureFlags: {} }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await getBooleanFlag("feat_dashboard_enabled", {
      distinctId: "explicit-id",
      userId: "user-id",
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.distinct_id).toBe("explicit-id");
  });

  it("falls back to businessId as distinctId when userId is absent", async () => {
    process.env.POSTHOG_HOST = "https://posthog.example";
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ featureFlags: {} }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await getBooleanFlag("feat_dashboard_enabled", { businessId: "biz-99" });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.distinct_id).toBe("biz-99");
    expect(body.person_properties.business_id).toBe("biz-99");
  });

  it("falls back to server as distinctId when no identity is supplied", async () => {
    process.env.POSTHOG_HOST = "https://posthog.example";
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ featureFlags: {} }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await getBooleanFlag("feat_dashboard_enabled", {});

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.distinct_id).toBe("server");
  });

  it("does not overwrite pre-set personProperties with context shortcuts", async () => {
    process.env.POSTHOG_HOST = "https://posthog.example";
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ featureFlags: {} }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await getBooleanFlag("feat_dashboard_enabled", {
      userId: "user-1",
      personProperties: { user_id: "override-user", extra: "data" },
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.person_properties.user_id).toBe("override-user");
    expect(body.person_properties.extra).toBe("data");
  });

  it("forwards groups from context to the decide request", async () => {
    process.env.POSTHOG_HOST = "https://posthog.example";
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ featureFlags: {} }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    await getBooleanFlag("feat_dashboard_enabled", {
      groups: { company: "acme", team: "eng" },
    });

    const body = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(body.groups).toEqual({ company: "acme", team: "eng" });
  });

  it("keeps separate cache entries for different distinctIds", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    const fetchSpy = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ featureFlags: { feat_dashboard_enabled: true } }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ featureFlags: { feat_dashboard_enabled: false } }),
      });
    vi.stubGlobal("fetch", fetchSpy);

    const result1 = await getBooleanFlag("feat_dashboard_enabled", { distinctId: "user-a" });
    const result2 = await getBooleanFlag("feat_dashboard_enabled", { distinctId: "user-b" });

    expect(result1).toBe(true);
    expect(result2).toBe(false);
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });

  it("uses safeTtl DEFAULT_TTL_MS when POSTHOG_FLAG_CACHE_TTL_MS is non-numeric", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";
    process.env.POSTHOG_FLAG_CACHE_TTL_MS = "not-a-number";

    const fetchSpy = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ featureFlags: { feat_dashboard_enabled: false } }),
    });
    vi.stubGlobal("fetch", fetchSpy);

    // Two calls with the same context → only 1 fetch (cache still works with default TTL)
    await getBooleanFlag("feat_dashboard_enabled", { distinctId: "u1" });
    await getBooleanFlag("feat_dashboard_enabled", { distinctId: "u1" });

    expect(fetchSpy).toHaveBeenCalledTimes(1);
  });

  it("reads feature_flags snake_case key from decide payload", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          // Use snake_case key, not camelCase
          feature_flags: { feat_dashboard_enabled: false },
        }),
      }),
    );

    await expect(
      getBooleanFlag("feat_dashboard_enabled", { distinctId: "u1" }),
    ).resolves.toBe(false);
  });

  it("getFlagValue returns a numeric variant value", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          featureFlags: { exp_pos_max_items: 42 },
        }),
      }),
    );

    await expect(
      getFlagValue("exp_pos_max_items", { distinctId: "u1" }, 10),
    ).resolves.toBe(42);
  });

  it("getFlagValue returns defaultValue when flag is absent from payload", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ featureFlags: {} }),
      }),
    );

    await expect(
      getFlagValue("exp_missing_flag", { distinctId: "u1" }, "my-default"),
    ).resolves.toBe("my-default");
  });

  it("ensureFlag returns the same result as getBooleanFlag", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ featureFlags: { feat_dashboard_enabled: false } }),
      }),
    );

    const [via_get, via_ensure] = await Promise.all([
      getBooleanFlag("feat_dashboard_enabled", { distinctId: "u1" }),
      ensureFlag("feat_dashboard_enabled", { distinctId: "u1" }),
    ]);

    expect(via_get).toBe(false);
    expect(via_ensure).toBe(false);
  });

  it("getBooleanFlag converts string 'true' from PostHog to boolean true", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ featureFlags: { feat_dashboard_enabled: "true" } }),
      }),
    );

    await expect(
      getBooleanFlag("feat_dashboard_enabled", { distinctId: "u1" }),
    ).resolves.toBe(true);
  });

  it("getBooleanFlag converts string 'false' from PostHog to boolean false", async () => {
    process.env.POSTHOG_PROJECT_API_KEY = "ph_key";

    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ featureFlags: { feat_dashboard_enabled: "false" } }),
      }),
    );

    await expect(
      getBooleanFlag("feat_dashboard_enabled", { distinctId: "u1" }),
    ).resolves.toBe(false);
  });

  it("getBooleanFlag uses context.defaultValue when explicit defaultValue is omitted", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);

    await expect(
      getBooleanFlag("unknown_flag_xyz", { defaultValue: true }),
    ).resolves.toBe(true);
    expect(fetchSpy).not.toHaveBeenCalled();
  });
});
