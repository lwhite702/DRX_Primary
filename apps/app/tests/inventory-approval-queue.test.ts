import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ token: vi.fn(), query: vi.fn(), mutation: vi.fn(), setAuth: vi.fn() }));
vi.mock("@/lib/auth/convex-token", () => ({ getConvexAuthToken: mocks.token }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { query = mocks.query; mutation = mocks.mutation; setAuth = mocks.setAuth; } }));
// Importing a legacy database anywhere in these routes fails this suite.
vi.mock("@/lib/db", () => { throw new Error("Intake routes must not import Prisma"); });
import { GET, POST } from "@/app/api/inventory/intake/route";
import { POST as decide } from "@/app/api/inventory/intake/approve/route";
import { GET as products } from "@/app/api/inventory/intake/products/route";
const request = (url = "/api/inventory/intake", body?: object) => new NextRequest(`http://localhost${url}`, {
  headers: { "x-business-id": "business-a", "Content-Type": "application/json" },
  ...(body ? { method: "POST", body: JSON.stringify(body) } : {}),
});
const body = { inventory_id: "canonical-product", total_cost: 12.34, total_weight_grams: 10, delivery_cost: 1.01, idempotency_key: "same-request" };

describe("Convex-only web intake routes", () => {
  beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud"); mocks.token.mockResolvedValue("synthetic-token"); });
  it("passes pending status and cursor without letting history displace pending rows", async () => {
    mocks.query.mockResolvedValue({ page: [{ id: "pending" }], continueCursor: "next", isDone: false });
    const response = await GET(request("/api/inventory/intake?status=pending&cursor=previous"));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ items: [{ id: "pending" }], continueCursor: "next", isDone: false });
    expect(mocks.query.mock.calls[0][1]).toEqual({ businessId: "business-a", status: "pending", paginationOpts: { numItems: 100, cursor: "previous" } });
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });
  it("submits integer cents and retains the retry key through Convex", async () => {
    mocks.mutation.mockResolvedValue({ intakeId: "intake", status: "approved", requiresApproval: false, replayed: true });
    const response = await POST(request(undefined, body));
    expect(response.status).toBe(200);
    expect((await response.json()).replayed).toBe(true);
    expect(mocks.mutation.mock.calls[0][1]).toMatchObject({ businessId: "business-a", productId: "canonical-product", totalCostCents: 1234, deliveryCostCents: 101, idempotencyKey: "same-request" });
  });
  it("fails closed on missing auth or business, invalid money and missing retry key", async () => {
    mocks.token.mockResolvedValue(null);
    expect((await POST(request(undefined, body))).status).toBe(401);
    mocks.token.mockResolvedValue("synthetic-token");
    expect((await GET(new NextRequest("http://localhost/api/inventory/intake"))).status).toBe(400);
    expect((await POST(request(undefined, { ...body, total_cost: 1.001 }))).status).toBe(400);
    expect((await POST(request(undefined, { ...body, idempotency_key: "" }))).status).toBe(400);
    expect(mocks.mutation).not.toHaveBeenCalled();
  });
  it("returns sanitized provider errors without a database fallback", async () => {
    mocks.mutation.mockRejectedValue(new Error("private provider payload"));
    const response = await POST(request(undefined, body));
    expect(response.status).toBe(503);
    expect(JSON.stringify(await response.json())).not.toContain("private provider payload");
  });
  it("uses Convex product pagination and decision authorization", async () => {
    mocks.query.mockResolvedValue({ page: [], isDone: true, continueCursor: "" });
    expect((await products(request("/api/inventory/intake/products"))).status).toBe(200);
    mocks.mutation.mockRejectedValue(new Error("FORBIDDEN: synthetic permission denial"));
    expect((await decide(request("/api/inventory/intake/approve", { intake_id: "canonical-intake", action: "approve" }))).status).toBe(403);
  });
});
