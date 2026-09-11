import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ client: vi.fn(), action: vi.fn() }));
vi.mock("@/lib/notifications/convex-server", async importOriginal => ({ ...await importOriginal<typeof import("../../lib/notifications/convex-server")>(), notificationClient: mocks.client }));
import { POST } from "../../app/api/notifications/alerts/route";
beforeEach(() => { vi.resetAllMocks(); mocks.client.mockResolvedValue({ expectedUserId: "actor", client: { action: mocks.action } }); });
const payload = { requestId: "attempt", type: "alert", message: "Synthetic", metadata: { source: "synthetic" } };
const request = (body: unknown = payload) => new NextRequest("https://example.invalid/api/notifications/alerts", { method: "POST", body: JSON.stringify(body) });
it("forwards the stable request and trusted actor without accepting actor overrides", async () => {
  mocks.action.mockResolvedValue({ notificationId: "notification", userId: "actor", message: "Synthetic" });
  const result = await POST(request({ ...payload, expectedUserId: "foreign" })); expect(result.status).toBe(201);
  expect(mocks.action.mock.calls[0][1]).toEqual({ requestId: "attempt", type: "alert", message: "Synthetic", metadataJson: JSON.stringify(payload.metadata), expectedUserId: "actor", targetUserId: "actor" });
  expect(result.headers.get("Cache-Control")).toBe("private, no-store");
});
it("requires a retry ID and rejects malformed input before an action", async () => {
  expect((await POST(request({ type: "alert", message: "Synthetic" }))).status).toBe(400);
  expect((await POST(request(null))).status).toBe(400); expect(mocks.action).not.toHaveBeenCalled();
});
it("sanitizes failed gates and changed retries", async () => {
  mocks.action.mockRejectedValueOnce(new Error("FEATURE_DISABLED: private context")); expect((await POST(request())).status).toBe(503);
  mocks.action.mockRejectedValueOnce(new Error("CONFLICT: private context")); const result = await POST(request()); expect(result.status).toBe(409); expect(JSON.stringify(await result.json())).not.toContain("private context");
});
