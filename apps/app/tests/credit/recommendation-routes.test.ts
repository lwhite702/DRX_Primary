import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { getFunctionName } from "convex/server";
const mocks = vi.hoisted(() => ({ user: vi.fn(), token: vi.fn(), flag: vi.fn(), query: vi.fn(), mutation: vi.fn(), action: vi.fn() }));
vi.mock("@/lib/adapters/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("@/lib/posthog/server-flags", () => ({ ensureServerFlag: mocks.flag }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; mutation = mocks.mutation; action = mocks.action; } }));
import { GET, POST as generate } from "../../app/api/credit/refresh-customer/route";
import { POST as apply, DELETE as resolveApply } from "../../app/api/credit/apply-recommendation/route";
const scope = { business_id: "business", expectedUserId: "operator", customer_id: "legacy-customer" };
const saved = { businessId: "business", customerId: "canonical-customer", recommendationId: "saved-recommendation", recommendedLimitCents: 500 };
const policy = { customerId: "canonical-customer", creditEnabled: false, limitCents: 1000, balanceCents: 200, unlimited: false };
const request = (path: string, body: unknown) => new Request(`https://example.invalid/api/credit/${path}`, { method: "POST", body: JSON.stringify(body) });
const generateRequest = (body: unknown = { ...scope, requestKey: "generate-one" }) => generate(request("refresh-customer", body));
const applyBody = { business_id: "business", expectedUserId: "operator", recommendationId: "saved-recommendation", requestKey: "apply-one" };
const applyRequest = (body: unknown = applyBody) => apply(request("apply-recommendation", body));
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud");
  mocks.user.mockResolvedValue({ id: "operator" }); mocks.token.mockResolvedValue("synthetic"); mocks.flag.mockResolvedValue(true);
  mocks.query.mockImplementation(async ref => {
    switch (getFunctionName(ref)) {
      case "creditPolicy:resolveScope": return { businessId: "business", customerId: "canonical-customer" };
      case "creditPolicy:read": return policy;
      default: return saved;
    }
  });
  mocks.action.mockResolvedValue(saved); mocks.mutation.mockResolvedValue({ ...policy, recommendationId: saved.recommendationId, policyRevision: 1 });
});
afterEach(() => { vi.unstubAllEnvs(); });
it("reads canonical saved recommendation and current policy without invented defaults", async () => {
  const result = await GET(new Request(`https://example.invalid/api/credit/refresh-customer?${new URLSearchParams(scope)}`));
  expect(result.status).toBe(200); expect(result.headers.get("cache-control")).toBe("private, no-store");
  expect(await result.json()).toEqual({ recommendation: saved, policy });
  expect(mocks.query.mock.calls.map(([ref]) => getFunctionName(ref))).toEqual(["creditRecommendations:latest", "creditPolicy:read"]);
  expect(mocks.query.mock.calls[0][1]).toEqual({ businessId: "business", expectedUserId: "operator", customerId: "legacy-customer" });
  mocks.query.mockResolvedValueOnce(null);
  expect(await (await GET(new Request(`https://example.invalid/?${new URLSearchParams(scope)}`))).json()).toEqual({ recommendation: null, policy });
});
it("generates only after scoped resolution and flags, preserving exact request identity", async () => {
  const result = await generateRequest(); expect(result.status).toBe(200);
  expect(await result.json()).toEqual({ recommendation: saved, requestKey: "generate-one" });
  expect(getFunctionName(mocks.action.mock.calls[0][0])).toBe("creditRecommendationGeneration:generate");
  expect(mocks.action.mock.calls[0][1]).toEqual({ businessId: "business", customerId: "canonical-customer", expectedUserId: "operator", requestKey: "generate-one" });
  expect(mocks.flag).toHaveBeenCalledTimes(2);
});
it("applies only an authorized saved ID with a request key, without accepting legacy override payloads", async () => {
  const result = await applyRequest(); expect(result.status).toBe(200);
  expect(await result.json()).toMatchObject({ requestKey: "apply-one", result: { recommendationId: saved.recommendationId, limitCents: 1000 } });
  expect(getFunctionName(mocks.query.mock.calls[0][0])).toBe("creditRecommendations:get");
  expect(getFunctionName(mocks.mutation.mock.calls[0][0])).toBe("creditRecommendations:apply");
  expect(mocks.mutation.mock.calls[0][1]).toEqual({ businessId: "business", expectedUserId: "operator", recommendationId: "saved-recommendation", requestKey: "apply-one" });
  expect((await applyRequest({ customer_id: "legacy", action: "override", new_limit: 100 })).status).toBe(400);
  expect(mocks.mutation).toHaveBeenCalledTimes(1);
});
it("rejects missing scope, duplicate queries, and stale or unauthenticated operators before backend work", async () => {
  expect((await generateRequest({ customer_id: "legacy" })).status).toBe(400);
  expect((await GET(new Request(`https://example.invalid/?${new URLSearchParams(scope)}&business_id=other`))).status).toBe(400);
  expect((await applyRequest({ ...applyBody, expectedUserId: "other" })).status).toBe(403);
  mocks.user.mockResolvedValue(null); expect((await generateRequest()).status).toBe(401);
  expect(mocks.query).not.toHaveBeenCalled(); expect(mocks.action).not.toHaveBeenCalled(); expect(mocks.mutation).not.toHaveBeenCalled();
});
it("does not send provider or policy writes when access or either feature gate fails", async () => {
  mocks.query.mockRejectedValueOnce(new Error("FORBIDDEN: private detail")); expect((await generateRequest()).status).toBe(403);
  mocks.flag.mockResolvedValueOnce(false); expect((await generateRequest()).status).toBe(503);
  mocks.flag.mockResolvedValueOnce(true).mockResolvedValueOnce(false); expect((await applyRequest()).status).toBe(503);
  expect(mocks.action).not.toHaveBeenCalled(); expect(mocks.mutation).not.toHaveBeenCalled();
});
it.each([["RATE_LIMITED", 429], ["STALE_SETTINGS", 409], ["INSUFFICIENT_HISTORY", 409], ["UNAVAILABLE", 503]])("sanitizes generation %s without exposing provider payloads", async (code, status) => {
  mocks.action.mockRejectedValueOnce(new Error(`${code}: secret-provider-payload`));
  const result = await generateRequest(); expect(result.status).toBe(status);
  expect(JSON.stringify(await result.json())).not.toContain("secret-provider-payload");
  expect(result.headers.get("cache-control")).toBe("private, no-store");
});
it("returns explicit stale application and current backend authorization failures", async () => {
  mocks.mutation.mockRejectedValueOnce(new Error("STALE_RECOMMENDATION: private"));
  expect(await (await applyRequest()).json()).toMatchObject({ code: "STALE_RECOMMENDATION" });
  mocks.mutation.mockRejectedValueOnce(new Error("FORBIDDEN: revoked during flags")); expect((await applyRequest()).status).toBe(403);
});

it("resolves uncertain apply requests without feature gates or reversals", async () => {
  mocks.flag.mockResolvedValue(false);
  const cancelled = { status: "cancelled", recommendationId: saved.recommendationId, requestKey: "apply-one" };
  mocks.mutation.mockResolvedValueOnce(cancelled);
  const result = await resolveApply(request("apply-recommendation", applyBody));
  expect(result.status).toBe(200); expect(await result.json()).toEqual(cancelled);
  expect(getFunctionName(mocks.mutation.mock.calls[0][0])).toBe("creditRecommendations:cancelApply");
  expect(mocks.flag).not.toHaveBeenCalled(); expect(mocks.action).not.toHaveBeenCalled();
  mocks.mutation.mockResolvedValueOnce({ status: "recorded", result: policy, requestKey: "apply-one" });
  expect(await (await resolveApply(request("apply-recommendation", applyBody))).json()).toMatchObject({ status: "recorded", result: policy });
  mocks.flag.mockResolvedValue(true);
  mocks.mutation.mockRejectedValueOnce(new Error("REQUEST_CANCELLED: private"));
  const failed = await applyRequest(); expect(failed.status).toBe(409);
  expect(await failed.json()).toMatchObject({ code: "REQUEST_CANCELLED" });
});
