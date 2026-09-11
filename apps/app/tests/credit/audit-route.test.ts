import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ user: vi.fn(), token: vi.fn(), query: vi.fn(), auth: vi.fn() }));
vi.mock("@/lib/adapters/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth = mocks.auth; query = mocks.query; } }));
import { GET } from "../../app/api/credit/audit-logs/route";
const request = (query: string) => new NextRequest(`https://example.invalid/api/credit/audit-logs?${query}`);
beforeEach(() => { vi.clearAllMocks(); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud"); mocks.user.mockResolvedValue({ id: "actor" }); mocks.token.mockResolvedValue("synthetic-token"); mocks.query.mockResolvedValue({ items: [], data: [], count: 0, isDone: true, continueCursor: "", coverage: "canonical_customer_credit_events", legacyHistoryIncluded: false }); });
afterEach(() => { vi.unstubAllEnvs(); });
it("passes explicit business/customer scope with trusted operator and bounded pagination", async () => {
  const response = await GET(request("business_id=tenant&customer_id=customer&cursor=next%2B%2F&limit=10"));
  expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(mocks.query).toHaveBeenCalledWith(expect.anything(), { businessId: "tenant", expectedUserId: "actor", customerId: "customer", accountId: undefined, paginationOpts: { cursor: "next+/", numItems: 10 } });
  expect(await response.json()).toMatchObject({ items: [], data: [], count: 0, legacyHistoryIncluded: false });
});
it("routes customerCreditId as a credit account identifier", async () => {
  await GET(request("business_id=tenant&customerCreditId=canonical-account"));
  expect(mocks.query.mock.calls[0][1]).toMatchObject({ accountId: "canonical-account", customerId: undefined });
});
it.each(["customerCreditId=legacy-limit", "business_id=tenant", "business_id=tenant&customer_id=c&limit=101", "business_id=tenant&customer_id=c&customer_id=d"])('rejects malformed scope %s', async query => {
  expect((await GET(request(query))).status).toBe(400); expect(mocks.query).not.toHaveBeenCalled();
});
it("rejects unauthenticated and mismatched operator before backend data access", async () => {
  mocks.user.mockResolvedValueOnce(null);
  expect((await GET(request("business_id=tenant&customer_id=c"))).status).toBe(401);
  expect((await GET(request("business_id=tenant&customer_id=c&expectedUserId=attacker"))).status).toBe(403);
  expect(mocks.query).not.toHaveBeenCalled();
});
it.each([["NOT_FOUND: private account", 404], ["FORBIDDEN: private membership", 403], ["private details", 503]])("sanitizes failed backend scope %s", async (message, status) => {
  mocks.query.mockRejectedValue(new Error(message as string));
  const response = await GET(request("business_id=tenant&customer_id=c"));
  expect(response.status).toBe(status); expect(await response.text()).not.toContain("private");
});
