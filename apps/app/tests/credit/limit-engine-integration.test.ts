import { afterEach, beforeEach, expect, it, vi } from "vitest";
const mocks = vi.hoisted(() => ({ limit: vi.fn(), get: vi.fn(), set: vi.fn(), cache: vi.fn(), query: vi.fn(), user: vi.fn(), token: vi.fn(), fetch: vi.fn() }));
vi.mock("@/lib/redis", () => ({ redis: { get: mocks.get, set: mocks.set }, cache: mocks.cache }));
vi.mock("@upstash/ratelimit", () => ({ Ratelimit: class { static slidingWindow() { return {}; } limit = mocks.limit; } }));
vi.mock("@/lib/data/client/supabase-client", () => { throw new Error("Recommendation settings must not load Supabase"); });
vi.mock("@/lib/adapters/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth() {} query = mocks.query; } }));
vi.mock("@/lib/logging", () => ({ logger: { error: vi.fn(), warn: vi.fn() } }));
import { computeAICreditLimit } from "../../lib/credit/aiEngine/limitEngine";
import type { CustomerFeatures } from "../../lib/credit/aiEngine/calculation";
const features: CustomerFeatures = { customer_id: "synthetic", sales_30d: 1000, sales_90d: 2000, sales_all_time: 5000, credit_issued_30d: 100, credit_issued_90d: 200, credit_issued_all_time: 500, credit_repaid_all_time: 300, completed_transactions: 10, late_payment_count: 0, days_since_first_transaction: 100, current_credit_balance: 200, average_ticket_size: 500, purchase_frequency_per_week: 1, on_time_repayment_ratio: 0.95, credit_utilization_ratio: 0.2, total_inventory_value: 1000, inventory_velocity_7d: 7, inventory_restock_cost_ratio: 0.5 };
const settings = { businessId: "business", enabled: true, maxCustomerCents: 1000000, inventoryCapBps: 5000, newCustomerCents: 100000, autoRefreshDays: 7, revision: 1 };
const valid = { recommended_limit: 1000, suggested_range_min: 0, suggested_range_max: 1500, risk_score: 0, justification: "Synthetic recommendation" };
function response(value: unknown) { return new Response(JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) } }] }), { status: 200 }); }
const run = (input = features, currentLimit = 1000, currentBalance = 200) => computeAICreditLimit("synthetic", "business", input, currentLimit, currentBalance);
beforeEach(() => {
  vi.clearAllMocks(); vi.stubEnv("OPENAI_API_KEY", "synthetic-test-key"); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud");
  mocks.limit.mockReset().mockResolvedValue({ success: true });
  mocks.get.mockReset().mockResolvedValue({ recommended_limit_final: 999999, used_ai: true });
  mocks.cache.mockReset().mockImplementation(async (_key: string, _ttl: number, loader: () => Promise<unknown>) => loader());
  mocks.query.mockReset().mockResolvedValue(settings);
  mocks.user.mockReset().mockResolvedValue({ id: "operator" });
  mocks.token.mockReset().mockResolvedValue("synthetic-token");
  mocks.fetch.mockReset().mockImplementation(async () => response(valid)); vi.stubGlobal("fetch", mocks.fetch);
});
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
it("validates the raw provider response and preserves zero risk", async () => {
  expect(await run()).toEqual({ recommended_limit_final: 500, risk_score_final: 0, justification_final: "Synthetic recommendation", suggested_range_min: 0, suggested_range_max: 1500, used_ai: true });
});
it.each([{}, null, { ...valid, recommended_limit: "100" }, { ...valid, risk_score: 101 }, { ...valid, justification: "" }, { ...valid, suggested_range_min: 2000 }])("rejects malformed provider data without default recommendation: %j", async provider => {
  mocks.fetch.mockResolvedValueOnce(response(provider));
  await expect(run()).rejects.toThrow("CREDIT_RECOMMENDATION_UNAVAILABLE");
});
it("keeps a zero inventory cap at zero instead of emergency 1000", async () => {
  expect(await run({ ...features, total_inventory_value: 0 })).toMatchObject({ recommended_limit_final: 0, risk_score_final: 0, used_ai: true });
});
it("preserves explicit zero configuration limits and ratios", async () => {
  mocks.query.mockResolvedValue({ ...settings, maxCustomerCents: 0, inventoryCapBps: 0, newCustomerCents: 0 });
  expect(await run()).toMatchObject({ recommended_limit_final: 0, suggested_range_max: 0 });
  vi.stubEnv("OPENAI_API_KEY", "");
  expect(await run({ ...features, days_since_first_transaction: 1 })).toMatchObject({ recommended_limit_final: 0, used_ai: false });
});
it.each([NaN, Infinity, -1])("rejects invalid features and current amounts before calling provider: %s", async value => {
  await expect(run({ ...features, sales_30d: value })).rejects.toThrow("CREDIT_RECOMMENDATION_UNAVAILABLE");
  await expect(run(features, value)).rejects.toThrow("CREDIT_RECOMMENDATION_UNAVAILABLE");
  await expect(run(features, 1000, value)).rejects.toThrow("CREDIT_RECOMMENDATION_UNAVAILABLE");
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("validates configuration before provider invocation", async () => {
  mocks.query.mockResolvedValue({ ...settings, maxCustomerCents: -1 });
  await expect(run()).rejects.toThrow("CREDIT_RECOMMENDATION_UNAVAILABLE"); expect(mocks.fetch).not.toHaveBeenCalled();
});
it("makes exhausted rate limits unavailable rather than returning a suggested limit", async () => {
  mocks.limit.mockResolvedValueOnce({ success: false });
  await expect(run()).rejects.toThrow("CREDIT_RECOMMENDATION_UNAVAILABLE"); expect(mocks.fetch).not.toHaveBeenCalled();
});
it("does not reuse or write customer-only recommendation caches when inputs change", async () => {
  expect((await run()).recommended_limit_final).toBe(500);
  expect((await run({ ...features, total_inventory_value: 200 })).recommended_limit_final).toBe(100);
  expect(mocks.fetch).toHaveBeenCalledTimes(2); expect(mocks.get).not.toHaveBeenCalled(); expect(mocks.set).not.toHaveBeenCalled();
  expect(mocks.cache).not.toHaveBeenCalled();
});
it("retains explicit deterministic fallback only when no provider key is configured", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  expect(await run()).toMatchObject({ recommended_limit_final: 360, risk_score_final: 20, used_ai: false, fallback_reason: "Using rule-based fallback" });
  expect(mocks.fetch).not.toHaveBeenCalled();
});
it("rejects provider transport, HTTP and parsing failures without exposing content", async () => {
  mocks.fetch.mockRejectedValueOnce(new Error("private provider payload"));
  await expect(run()).rejects.toThrow("CREDIT_RECOMMENDATION_UNAVAILABLE: Credit recommendation is unavailable");
  mocks.fetch.mockResolvedValueOnce(new Response("private provider payload", { status: 503 }));
  await expect(run()).rejects.toThrow("CREDIT_RECOMMENDATION_UNAVAILABLE");
  mocks.fetch.mockResolvedValueOnce(new Response(JSON.stringify({ choices: [{ message: { content: "invalid JSON" } }] }), { status: 200 }));
  await expect(run()).rejects.toThrow("CREDIT_RECOMMENDATION_UNAVAILABLE");
});

it.each([null, { ...settings, enabled: false }])("requires explicit enabled canonical settings: %j", async value => {
  mocks.query.mockResolvedValue(value);
  await expect(run()).rejects.toThrow("CREDIT_RECOMMENDATION_UNAVAILABLE"); expect(mocks.fetch).not.toHaveBeenCalled();
});
it("requires authentication and token before provider access", async () => {
  mocks.user.mockResolvedValueOnce(null);
  await expect(run()).rejects.toThrow("CREDIT_RECOMMENDATION_UNAVAILABLE");
  mocks.token.mockResolvedValueOnce(null);
  await expect(run()).rejects.toThrow("CREDIT_RECOMMENDATION_UNAVAILABLE"); expect(mocks.fetch).not.toHaveBeenCalled();
});
it("reads updated canonical settings for each new calculation without a config cache", async () => {
  expect((await run()).recommended_limit_final).toBe(500);
  mocks.query.mockResolvedValue({ ...settings, revision: 2, maxCustomerCents: 10000 });
  expect((await run()).recommended_limit_final).toBe(100);
  expect(mocks.query).toHaveBeenCalledTimes(4); expect(mocks.cache).not.toHaveBeenCalled();
});
it.each([{ ...settings, revision: 2 }, { ...settings, businessId: "other-business" }, { ...settings, enabled: false }])("rejects settings/context changes while provider executes: %j", async next => {
  mocks.query.mockResolvedValueOnce(settings).mockResolvedValueOnce(next);
  await expect(run()).rejects.toThrow("CREDIT_RECOMMENDATION_UNAVAILABLE"); expect(mocks.fetch).toHaveBeenCalledTimes(1);
});
it("rejects operator changes and revoked authorization after generation", async () => {
  mocks.user.mockResolvedValueOnce({ id: "operator" }).mockResolvedValueOnce({ id: "other-operator" });
  await expect(run()).rejects.toThrow("CREDIT_RECOMMENDATION_UNAVAILABLE");
  mocks.user.mockResolvedValue({ id: "operator" });
  mocks.query.mockResolvedValueOnce(settings).mockRejectedValueOnce(new Error("FORBIDDEN: Membership revoked"));
  await expect(run()).rejects.toThrow("CREDIT_RECOMMENDATION_UNAVAILABLE");
});
it("rechecks canonical settings even for an intentional rule fallback", async () => {
  vi.stubEnv("OPENAI_API_KEY", "");
  mocks.query.mockResolvedValueOnce(settings).mockResolvedValueOnce({ ...settings, revision: 2 });
  await expect(run()).rejects.toThrow("CREDIT_RECOMMENDATION_UNAVAILABLE"); expect(mocks.fetch).not.toHaveBeenCalled();
});
