import { beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import * as notifications from "../../convex/notifications";
import * as generatedApi from "../../convex/_generated/api";
const mocks = vi.hoisted(() => ({ client: vi.fn() }));
vi.mock("@/lib/notifications/convex-server", async importOriginal => ({ ...await importOriginal<typeof import("../../lib/notifications/convex-server")>(), notificationClient: mocks.client }));
import { GET, PUT } from "../../app/api/notifications/route";
import { DELETE } from "../../app/api/notifications/alerts/[id]/route";
const create = () => convexTest(schema, { "notifications.ts": async () => notifications, "_generated/api.js": async () => generatedApi });
let t: ReturnType<typeof create>;
beforeEach(() => { t = create(); mocks.client.mockResolvedValue({ expectedUserId: "actor", client: { query: (ref: any, args: any) => t.withIdentity({ subject: "actor" }).query(ref, args), action: (ref: any, args: any) => t.withIdentity({ subject: "actor" }).action(ref, args), mutation: (ref: any, args: any) => t.withIdentity({ subject: "actor" }).mutation(ref, args) } }); });
const request = () => new NextRequest("https://example.invalid/api/notifications/alerts/id", { method: "DELETE" });
it("rejects deletion of another recipient's notification without modifying it", async () => {
  const id = await t.run(ctx => ctx.db.insert("notifications", { userId: "foreign", title: "Synthetic", message: "Private", type: "alert", isRead: false, isDeleted: false, createdAt: 1 }));
  const response = await DELETE(request(), { params: Promise.resolve({ id }) }); expect(response.status).toBe(404);
  expect((await t.run(ctx => ctx.db.get(id)))!.isDeleted).toBe(false);
  expect(await t.run(ctx => ctx.db.query("notificationEvents").collect())).toHaveLength(0);
});
it("resolves reconciled legacy IDs, removes notification content and audits only once", async () => {
  const id = await t.run(ctx => ctx.db.insert("notifications", { userId: "actor", title: "Synthetic", message: "Private", type: "alert", isRead: false, isDeleted: false, createdAt: 1, legacyId: "legacy-id" }));
  for (let i = 0; i < 2; i++) expect((await DELETE(request(), { params: Promise.resolve({ id: "legacy-id" }) })).status).toBe(200);
  expect(await t.run(ctx => ctx.db.get(id))).toBeNull(); expect(await t.run(ctx => ctx.db.query("notificationEvents").collect())).toHaveLength(1);
});

it("lists the actor's unread records and completes every mark-all batch before success", async () => {
  await t.run(async ctx => {
    for (let i = 0; i < 205; i++) await ctx.db.insert("notifications", { userId: "actor", title: "Synthetic", message: "Private", type: "alert", isRead: false, isDeleted: false, createdAt: 1 });
    await ctx.db.insert("notifications", { userId: "foreign", title: "Synthetic", message: "Private", type: "alert", isRead: false, isDeleted: false, createdAt: 1 });
  });
  const before = await GET(request()); expect(before.status).toBe(200);
  const list = await before.json(); expect(list.count).toBe(100); expect(list.data).toEqual(list.notifications);
  const result = await PUT(new NextRequest("https://example.invalid/api/notifications", { method: "PUT", body: JSON.stringify({ mark_all_read: true, userId: "foreign" }) }));
  expect(result.status).toBe(200); expect(await result.json()).toEqual({ success: true });
  expect((await (await GET(request())).json()).count).toBe(0);
  const unread = await t.run(ctx => ctx.db.query("notifications").filter(q => q.eq(q.field("isRead"), false)).collect());
  expect(unread).toHaveLength(1); expect(unread[0].userId).toBe("foreign");
  expect(await t.run(ctx => ctx.db.query("notificationEvents").collect())).toHaveLength(205);
});
it("rejects malformed mark-read bodies and reports uncertain failures without success", async () => {
  const body = (value: unknown) => new NextRequest("https://example.invalid/api/notifications", { method: "PUT", body: JSON.stringify(value) });
  expect((await PUT(body({ mark_all_read: "yes" }))).status).toBe(400);
  expect((await PUT(body(null))).status).toBe(400);
  mocks.client.mockResolvedValueOnce({ expectedUserId: "actor", client: { action: async () => { throw new Error("private backend error"); } } });
  const result = await PUT(body({ mark_all_read: true })); expect(result.status).toBe(503);
  const payload = await result.json(); expect(payload.success).not.toBe(true); expect(JSON.stringify(payload)).not.toContain("private backend");
});
