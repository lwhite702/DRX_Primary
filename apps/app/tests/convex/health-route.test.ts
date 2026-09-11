import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import * as health from "../../convex/health";
import * as generatedApi from "../../convex/_generated/api";
const mocks = vi.hoisted(() => ({ query: vi.fn() }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { query = mocks.query; } }));
import { GET } from "../../app/api/health/route";
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud"); });
afterEach(() => { vi.unstubAllEnvs(); });
it("probes the canonical database without returning tenant records and disables caching", async () => {
  const t = convexTest(schema, { "health.ts": async () => health, "_generated/api.js": async () => generatedApi });
  mocks.query.mockImplementation(t.query.bind(t));
  const response = await GET();
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("no-store");
  expect(await response.json()).toEqual({ status: "healthy", checks: { database: true, timestamp: expect.any(String), uptime: expect.any(Number) } });
});
it("fails closed for missing configuration, backend errors and malformed results", async () => {
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "");
  expect((await GET()).status).toBe(503); expect(mocks.query).not.toHaveBeenCalled();
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud");
  mocks.query.mockRejectedValueOnce(new Error("private backend details"));
  const failed = await GET(); expect(failed.status).toBe(503);
  expect(JSON.stringify(await failed.json())).not.toContain("private backend details");
  mocks.query.mockResolvedValueOnce({ unexpected: true });
  expect((await GET()).status).toBe(503);
});
