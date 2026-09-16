import { expect, it, vi } from "vitest";
import { businessSettingsResponseSchema, pinUpdate } from "../../lib/business/settings-client";
import { getDefaultPrivacyProtocol } from "../../lib/privacy/profiles";
import { fetchPrivacyContext } from "../../lib/privacy/client-context";
it("keeps an existing PIN on ordinary saves and distinguishes replacement from explicit removal", () => {
  expect(pinUpdate("", false)).toEqual({});
  expect(pinUpdate("2468", true)).toEqual({ posManagerPin: "2468" });
  expect(pinUpdate("", true)).toEqual({ posManagerPin: null });
});
it("rejects incomplete settings responses instead of silently presenting defaults", () => {
  const response = { collectTax: false, defaultTaxRate: 0, posManagerPinConfigured: true, privacySettingsEnabled: true, privacyProtocol: getDefaultPrivacyProtocol(), privacyRevision: 2 };
  expect(businessSettingsResponseSchema.parse(response)).toMatchObject({ defaultTaxRate: 0, privacyRevision: 2 });
  expect(businessSettingsResponseSchema.safeParse({ ...response, privacyProtocol: "Strict" }).success).toBe(false);
  expect(businessSettingsResponseSchema.safeParse({ ...response, privacyProtocol: null }).success).toBe(false);
});
it("fails closed on policy/preference errors, preserving explicit false and selected business", async () => {
  const fetcher = vi.fn().mockResolvedValueOnce(new Response(JSON.stringify({ protocol: getDefaultPrivacyProtocol() }))).mockResolvedValueOnce(new Response(JSON.stringify({ manual_enabled: false })));
  vi.stubGlobal("fetch", fetcher);
  try {
    expect(await fetchPrivacyContext("synthetic-business")).toMatchObject({ manualEnabled: false });
    expect(fetcher.mock.calls[0][1].headers).toEqual({ "X-Business-Id": "synthetic-business" });
    fetcher.mockResolvedValueOnce(new Response(JSON.stringify({ error: "Unavailable" }), { status: 503 })).mockResolvedValueOnce(new Response(JSON.stringify({ manual_enabled: true })));
    await expect(fetchPrivacyContext("synthetic-business")).rejects.toThrow(/unavailable/);
  } finally { vi.unstubAllGlobals(); }
});
