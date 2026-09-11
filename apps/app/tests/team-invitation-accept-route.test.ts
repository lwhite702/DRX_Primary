import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ token: vi.fn(), mutation: vi.fn(), setAuth: vi.fn() }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { setAuth = mocks.setAuth; mutation = mocks.mutation; } }));
import { POST } from "../app/api/team/invitations/accept/route";
beforeEach(() => { vi.resetAllMocks(); mocks.token.mockResolvedValue("synthetic-auth-token"); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud"); });
afterEach(() => { vi.unstubAllEnvs(); });
const body = { token: "synthetic-invitation", businessId: "a".repeat(32) };
const request = (payload: unknown = body) => new NextRequest("https://example.invalid/api/team/invitations/accept", { method: "POST", body: JSON.stringify(payload) });
it("accepts without requiring an existing business context and returns expired invitations as gone", async () => {
  mocks.mutation.mockResolvedValue({ status: "expired", businessId: body.businessId });
  const result = await POST(request());
  expect(result.status).toBe(410); expect(result.headers.get("Cache-Control")).toBe("private, no-store");
  expect(mocks.mutation.mock.calls[0][1]).toEqual(body);
  expect(mocks.setAuth).toHaveBeenCalledWith("synthetic-auth-token");
});
it("rejects missing authentication and malformed bodies before a mutation", async () => {
  mocks.token.mockResolvedValueOnce(null);
  expect((await POST(request())).status).toBe(401);
  expect((await POST(request(null))).status).toBe(400);
  expect(mocks.mutation).not.toHaveBeenCalled();
});
it("sanitizes unexpected failures and maps account mismatches", async () => {
  mocks.mutation.mockRejectedValueOnce(new Error("private provider content"));
  const result = await POST(request()); expect(result.status).toBe(503);
  expect(JSON.stringify(await result.json())).not.toContain("private provider");
  mocks.mutation.mockRejectedValueOnce(new Error("FORBIDDEN: Verified email required"));
  expect((await POST(request())).status).toBe(403);
});
