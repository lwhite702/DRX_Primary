import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Webhook } from "svix";
const mocks = vi.hoisted(() => ({ action: vi.fn(), headers: vi.fn() }));
vi.mock("convex/browser", () => ({ ConvexHttpClient: class { action = mocks.action; } }));
vi.mock("next/headers", () => ({ headers: mocks.headers }));
vi.mock("@/lib/db", () => ({ prisma: {} }));
import { POST } from "../../app/api/webhooks/clerk/route";
const secret = "whsec_" + Buffer.from("synthetic-forwarding-test-key").toString("base64");
beforeEach(() => { vi.resetAllMocks(); vi.stubEnv("CLERK_WEBHOOK_SECRET", secret); vi.stubEnv("NEXT_PUBLIC_CONVEX_URL", "https://synthetic.convex.cloud"); mocks.action.mockResolvedValue("accepted"); });
afterEach(() => { vi.unstubAllEnvs(); });
function request() {
  const body = '{ "type": "user.created", "data": { "id": "synthetic-user" } }';
  const now = new Date(), signature = new Webhook(secret).sign("synthetic-event", now, body), timestamp = Math.floor(now.getTime() / 1000).toString();
  mocks.headers.mockResolvedValue(new Headers({ "svix-id": "synthetic-event", "svix-timestamp": timestamp, "svix-signature": signature }));
  return { req: new Request("https://example.invalid/api/webhooks/clerk", { method: "POST", body, headers: { "svix-id": "synthetic-event", "svix-timestamp": timestamp, "svix-signature": signature } }), body, signature, timestamp };
}
it("forwards the exact signed bytes rather than reserializing JSON", async () => {
  const { req, body, signature, timestamp } = request();
  expect((await POST(req)).status).toBe(200);
  expect(mocks.action.mock.calls[0][1]).toEqual({ body, svixId: "synthetic-event", svixTimestamp: timestamp, svixSignature: signature });
});
it("returns a retryable failure when canonical acceptance fails", async () => {
  mocks.action.mockRejectedValue(new Error("Synthetic backend unavailable"));
  expect((await POST(request().req)).status).toBe(503);
});
