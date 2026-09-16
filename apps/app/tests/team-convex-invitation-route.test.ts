import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
const mocks = vi.hoisted(() => ({ client: vi.fn(), mutation: vi.fn(), send: vi.fn() }));
vi.mock("@/lib/business/convex-server", () => ({ businessClient: mocks.client }));
vi.mock("@/lib/adapters/auth/server", () => ({ clerkClient: async () => ({ invitations: { createInvitation: mocks.send } }) }));
import { POST } from "../app/api/team/members/route";
const prepared = { inviteId: "invite-a", token: "secret-invite-token", email: "staff@example.invalid", role: "cashier", expiresAt: 1000 };
beforeEach(() => { vi.resetAllMocks(); mocks.client.mockResolvedValue({ client: { mutation: mocks.mutation }, businessId: "tenant-a", expectedUserId: "owner-a" }); mocks.mutation.mockResolvedValueOnce(prepared).mockResolvedValue(null); mocks.send.mockResolvedValue({ id: "provider-a" }); });
const request = () => new NextRequest("https://example.invalid/api/team/members", { method: "POST", body: JSON.stringify({ email: "staff@example.invalid", role: "cashier" }) });
it("persists the invitation before sending and returns the established public response", async () => {
  const result = await POST(request()); expect(result.status).toBe(201);
  expect(await result.json()).toEqual({ id: "provider-a", email: prepared.email, role: "cashier", status: "pending", expiresAt: new Date(1000).toISOString() });
  expect(mocks.mutation.mock.invocationCallOrder[0]).toBeLessThan(mocks.send.mock.invocationCallOrder[0]);
  expect(mocks.mutation.mock.calls[1][1]).toMatchObject({ businessId: "tenant-a", expectedUserId: "owner-a", inviteId: "invite-a", providerInvitationId: "provider-a" });
});
it("does not send when Convex rejects a duplicate", async () => {
  mocks.mutation.mockReset().mockRejectedValue(new Error("ALREADY_EXISTS: duplicate"));
  expect((await POST(request())).status).toBe(409); expect(mocks.send).not.toHaveBeenCalled();
});
it("records unknown delivery without sending again after a timeout", async () => {
  mocks.send.mockRejectedValue(new Error("sensitive timeout payload"));
  const response = await POST(request()); expect(response.status).toBe(503);
  expect(JSON.stringify(await response.json())).not.toContain("sensitive");
  expect(mocks.send).toHaveBeenCalledTimes(1);
  expect(mocks.mutation.mock.calls[1][1]).toEqual({ businessId: "tenant-a", expectedUserId: "owner-a", inviteId: "invite-a" });
});
it("retries only the delivery receipt when its first write fails", async () => {
  mocks.mutation.mockReset().mockResolvedValueOnce(prepared).mockRejectedValueOnce(new Error("temporary failure")).mockResolvedValueOnce(null);
  expect((await POST(request())).status).toBe(201); expect(mocks.send).toHaveBeenCalledTimes(1);
  expect(mocks.mutation.mock.calls[2][1]).toMatchObject({ providerInvitationId: "provider-a" });
});
