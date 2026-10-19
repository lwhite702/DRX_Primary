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

it("prefers CONVEX_URL and rejects non-HTTPS URLs in production", async () => {
  const t = convexTest(schema, { "health.ts": async () => health, "_generated/api.js": async () => generatedApi });
  mocks.query.mockImplementation(t.query.bind(t));

  // Server-only CONVEX_URL works
  vi.stubEnv("CONVEX_URL", "https://internal.convex.cloud");
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://public.convex.cloud");
  const res = await GET();
  expect(res.status).toBe(200);

  // In production, non-HTTPS URLs are rejected
  vi.stubEnv("NODE_ENV", "production");
  vi.stubEnv("CONVEX_URL", "http://insecure.convex.cloud");
  const insecureRes = await GET();
  expect(insecureRes.status).toBe(503);
});

it("sanitizes surrounding quotes from Convex URL configuration", async () => {
  const t = convexTest(schema, { "health.ts": async () => health, "_generated/api.js": async () => generatedApi });
  mocks.query.mockImplementation(t.query.bind(t));

  // Strips surrounding double quotes
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", '"https://synthetic.convex.cloud"');
  const doubleQuoteRes = await GET();
  expect(doubleQuoteRes.status).toBe(200);
  expect((await doubleQuoteRes.json()).status).toBe("healthy");

  // Strips surrounding single quotes
  vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "'https://synthetic.convex.cloud'");
  const singleQuoteRes = await GET();
  expect(singleQuoteRes.status).toBe(200);
  expect((await singleQuoteRes.json()).status).toBe("healthy");
});

it("enforces machine authorization when HEALTHCHECK_SECRET is configured", async () => {
  vi.stubEnv("HEALTHCHECK_SECRET", "super-secret-probe-token");
  const t = convexTest(schema, { "health.ts": async () => health, "_generated/api.js": async () => generatedApi });
  mocks.query.mockImplementation(t.query.bind(t));

  // Anonymous request without credentials -> 401
  const anonRes = await GET();
  expect(anonRes.status).toBe(401);
  expect(anonRes.headers.get("Cache-Control")).toBe("no-store");
  expect(await anonRes.json()).toEqual({ error: "Unauthorized" });

  // Request with invalid Bearer token -> 401
  const invalidBearer = new Request("https://deelrxcrm.app/api/health", {
    headers: { authorization: "Bearer wrong-token" },
  });
  const invalidRes = await GET(invalidBearer);
  expect(invalidRes.status).toBe(401);

  // Request with valid Bearer token -> 200
  const validBearer = new Request("https://deelrxcrm.app/api/health", {
    headers: { authorization: "Bearer super-secret-probe-token" },
  });
  const bearerRes = await GET(validBearer);
  expect(bearerRes.status).toBe(200);
  expect((await bearerRes.json()).status).toBe("healthy");

  // Request with x-readiness-token header -> 200
  const validReadiness = new Request("https://deelrxcrm.app/api/health", {
    headers: { "x-readiness-token": "super-secret-probe-token" },
  });
  const readinessRes = await GET(validReadiness);
  expect(readinessRes.status).toBe(200);

  // Request with x-healthcheck-token header -> 200
  const validHealthcheck = new Request("https://deelrxcrm.app/api/health", {
    headers: { "x-healthcheck-token": "super-secret-probe-token" },
  });
  const healthcheckRes = await GET(validHealthcheck);
  expect(healthcheckRes.status).toBe(200);
});

it("supports Vercel protection bypass secret when configured", async () => {
  vi.stubEnv("VERCEL_AUTOMATION_BYPASS_SECRET", "vercel-bypass-token");
  const t = convexTest(schema, { "health.ts": async () => health, "_generated/api.js": async () => generatedApi });
  mocks.query.mockImplementation(t.query.bind(t));

  // Wrong bypass token -> 401
  const wrongReq = new Request("https://deelrxcrm.app/api/health", {
    headers: { "x-vercel-protection-bypass": "wrong-bypass" },
  });
  expect((await GET(wrongReq)).status).toBe(401);

  // Correct bypass token -> 200
  const correctReq = new Request("https://deelrxcrm.app/api/health", {
    headers: { "x-vercel-protection-bypass": "vercel-bypass-token" },
  });
  const res = await GET(correctReq);
  expect(res.status).toBe(200);
  expect((await res.json()).status).toBe("healthy");

  // Anonymous request without bypass header is allowed under public health policy when HEALTHCHECK_SECRET is unset
  const anonRes = await GET();
  expect(anonRes.status).toBe(200);
  expect((await anonRes.json()).status).toBe("healthy");
});


