import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ client: vi.fn(), query: vi.fn() }));
vi.mock("@/lib/business/convex-server", () => ({ businessClient: mocks.client }));
import { GET } from "../app/api/team/members/[id]/audit-logs/route";
beforeEach(() => {
  vi.resetAllMocks();
  mocks.client.mockResolvedValue({ client: { query: mocks.query }, businessId: "tenant-a", expectedUserId: "operator-a" });
});
const request = () => new NextRequest("https://example.invalid/api/team/members/member-a/audit-logs");
const params = { params: Promise.resolve({ id: "member-a" }) };
it("preserves the audit array contract across pages and passes authenticated tenant context", async () => {
  const event = { id: "event-a", userId: "operator-a", businessId: "tenant-a", action: "role_update", entityType: "team_member", entityId: "member-a", metadata: "{}", createdAt: 0 };
  mocks.query.mockResolvedValueOnce({ page: [event], isDone: false, continueCursor: "next" }).mockResolvedValueOnce({ page: [{ ...event, id: "event-b" }], isDone: true, continueCursor: "end" });
  const response = await GET(request(), params);
  expect(response.status).toBe(200);
  expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  expect(await response.json()).toEqual([{ ...event, createdAt: "1970-01-01T00:00:00.000Z" }, { ...event, id: "event-b", createdAt: "1970-01-01T00:00:00.000Z" }]);
  expect(mocks.query.mock.calls[1][1]).toEqual({ businessId: "tenant-a", expectedUserId: "operator-a", id: "member-a", paginationOpts: { cursor: "next", numItems: 100 } });
});
it("fails closed without publishing partial audit history or provider errors", async () => {
  mocks.query.mockResolvedValueOnce({ page: [], isDone: false, continueCursor: "next" }).mockRejectedValueOnce(new Error("private provider details"));
  const response = await GET(request(), params);
  expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain("private provider");
});
it("rejects unauthorized context before reading audit records", async () => {
  mocks.client.mockRejectedValue(new Error("UNAUTHORIZED: missing session"));
  expect((await GET(request(), params)).status).toBe(401);
  expect(mocks.query).not.toHaveBeenCalled();
});
