import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as session from "../../convex/session";
import * as onboarding from "../../convex/onboarding";
import * as preferences from "../../convex/businessPreferences";
import * as generatedApi from "../../convex/_generated/api";
const mocks = vi.hoisted(() => ({ token: vi.fn(), query: vi.fn(), bypass: vi.fn(), flag: vi.fn() }));
vi.mock("@/lib/db", () => { throw new Error("PIN verification must not load Prisma"); });
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("@/lib/auth/bypass", () => ({ isAuthBypassEnabledServer: mocks.bypass }));
vi.mock("@/lib/posthog/server-flags", () => ({ ensureServerFlag: mocks.flag }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; } }));
import { GET, POST } from "@/app/api/pos/exit/verify/route";
const modules = { "_generated/api.js": async () => generatedApi, "session.ts": async () => session, "onboarding.ts": async () => onboarding, "businessPreferences.ts": async () => preferences };
function getRequest() { return new NextRequest("https://example.invalid/api/pos/exit/verify"); }
function postRequest(pin = "") { return new NextRequest("https://example.invalid/api/pos/exit/verify", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ pin }) }); }
async function setup(pin?: string) {
  const t = convexTest(schema, modules);
  const actor = t.withIdentity({ subject: "pin-operator" });
  const { businessId } = await actor.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic PIN" });
  if (pin) await actor.mutation(api.businessPreferences.saveSettings, { businessId, posManagerPin: pin });
  mocks.query.mockImplementation((ref, args) => actor.query(ref, args));
  return { t, actor, businessId };
}
describe("Convex Quick Sale exit PIN", () => {
  beforeEach(() => { vi.resetAllMocks(); process.env.NEXT_PUBLIC_CONVEX_URL = "https://synthetic.convex.cloud"; mocks.token.mockResolvedValue("synthetic"); mocks.bypass.mockReturnValue(false); mocks.flag.mockResolvedValue(true); });
  it("GET allows exit without a PIN", async () => { await setup(); expect(await (await GET(getRequest())).json()).toEqual({ allowed: true, hasPinConfigured: false }); });
  it("GET requires configured PIN verification", async () => { await setup("2468"); expect(await (await GET(getRequest())).json()).toEqual({ allowed: false, hasPinConfigured: true }); });
  it("POST allows exit without a PIN", async () => { await setup(); expect(await (await POST(postRequest())).json()).toEqual({ allowed: true, hasPinConfigured: false }); });
  it("rejects the wrong PIN", async () => { await setup("2468"); expect(await (await POST(postRequest("0000"))).json()).toEqual({ allowed: false, hasPinConfigured: true }); });
  it("accepts the configured PIN", async () => { await setup("2468"); expect(await (await POST(postRequest("2468"))).json()).toEqual({ allowed: true, hasPinConfigured: true }); });
  it("preserves explicit local bypass without querying a database", async () => { mocks.bypass.mockReturnValue(true); expect(await (await POST(postRequest())).json()).toEqual({ allowed: true, hasPinConfigured: false }); expect(mocks.query).not.toHaveBeenCalled(); });
  it("rejects signed-out requests", async () => { mocks.token.mockResolvedValue(null); expect((await POST(postRequest())).status).toBe(401); });
  it("preserves the enforcement flag and never exposes a PIN or provider error", async () => {
    await setup("2468"); mocks.flag.mockResolvedValue(false);
    expect(await (await POST(postRequest())).json()).toEqual({ allowed: true, hasPinConfigured: false });
    mocks.flag.mockResolvedValue(true); mocks.query.mockRejectedValue(new Error("private-provider-payload"));
    const failed = await POST(postRequest()); expect(failed.status).toBe(503); expect(await failed.text()).not.toContain("private-provider-payload");
  });
});
