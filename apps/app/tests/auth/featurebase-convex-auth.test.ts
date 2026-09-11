import { afterEach, beforeEach, expect, it, vi } from "vitest";
import jwt from "jsonwebtoken";
const mocks = vi.hoisted(() => ({ user: vi.fn(), token: vi.fn(), query: vi.fn(), setAuth: vi.fn(), getUser: vi.fn() }));
vi.mock("@/lib/adapters/auth", () => ({ getCurrentUser: mocks.user }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("@/lib/adapters/auth/server", () => ({ clerkClient: async () => ({ users: { getUser: mocks.getUser } }) }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { query = mocks.query; setAuth = mocks.setAuth; } }));
import { GET } from "../../app/api/featurebase/auth/route";
const secret = "synthetic-test-signing-secret";
beforeEach(() => {
  vi.resetAllMocks(); vi.stubEnv("FEATUREBASE_JWT_SECRET", secret); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud");
  mocks.user.mockResolvedValue({ id: "operator" }); mocks.token.mockResolvedValue("synthetic-token");
  mocks.query.mockResolvedValue({ email: "operator@example.invalid", name: "Canonical name" });
  mocks.getUser.mockResolvedValue({ id: "operator", primaryEmailAddress: { emailAddress: "operator@example.invalid", verification: { status: "verified" } }, firstName: "Provider" });
});
afterEach(() => { vi.unstubAllEnvs(); });
it("signs the established claims using the canonical profile and verified provider email", async () => {
  const response = await GET(); expect(response.status).toBe(200); expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  const { token } = await response.json(); const claims = jwt.verify(token, secret, { algorithms: ["HS256"] }) as jwt.JwtPayload;
  expect(claims).toMatchObject({ userId: "operator", email: "operator@example.invalid", name: "Canonical name" }); expect(claims.exp! - claims.iat!).toBe(3600);
  expect(mocks.query.mock.calls[0][1]).toEqual({ expectedUserId: "operator" }); expect(mocks.setAuth).toHaveBeenCalledWith("synthetic-token");
});
it("supports a signed-in operator without a business profile using verified identity", async () => {
  mocks.query.mockResolvedValue(null); const response = await GET(); expect(response.status).toBe(200);
});
it("rejects unverified email and profile mismatch without minting a token", async () => {
  mocks.getUser.mockResolvedValueOnce({ id: "operator", primaryEmailAddress: { emailAddress: "operator@example.invalid", verification: { status: "unverified" } } });
  expect((await GET()).status).toBe(403);
  mocks.query.mockResolvedValue({ email: "other@example.invalid", name: "Other" }); const response = await GET(); expect(response.status).toBe(503); expect(await response.json()).not.toHaveProperty("token");
});
it("sanitizes backend failures and does not bypass unavailable Convex with provider fallback", async () => {
  mocks.query.mockRejectedValue(new Error("private backend content")); const response = await GET(); expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain("private backend"); expect(mocks.getUser).not.toHaveBeenCalled();
});
it("rejects unauthenticated access before loading profile or provider data", async () => {
  mocks.user.mockResolvedValue(null); expect((await GET()).status).toBe(401); expect(mocks.query).not.toHaveBeenCalled(); expect(mocks.getUser).not.toHaveBeenCalled();
});
