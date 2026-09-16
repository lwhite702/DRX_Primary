import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as notifications from "../../convex/notifications";
import * as generatedApi from "../../convex/_generated/api";
const create = () => convexTest(schema, { "notifications.ts": async () => notifications, "_generated/api.js": async () => generatedApi });
const row = { userId: "recipient", title: "Synthetic", message: "Synthetic private message", type: "alert", isRead: false, isDeleted: false, createdAt: 1 };
it("restricts read/delete to the recipient and makes retries idempotent", async () => {
  const t = create(), recipient = t.withIdentity({ subject: "recipient" });
  const notificationId = await t.run(ctx => ctx.db.insert("notifications", row));
  const args = { expectedUserId: "recipient", notificationId };
  await expect(t.withIdentity({ subject: "foreign" }).mutation(api.notifications.remove, { ...args, expectedUserId: "foreign" })).rejects.toThrow(/NOT_FOUND/);
  await expect(t.withIdentity({ subject: "foreign" }).mutation(api.notifications.markRead, { ...args, expectedUserId: "foreign" })).rejects.toThrow(/NOT_FOUND/);
  await recipient.mutation(api.notifications.markRead, args); await recipient.mutation(api.notifications.markRead, args);
  await recipient.mutation(api.notifications.remove, args); await recipient.mutation(api.notifications.remove, args);
  const events = await t.run(ctx => ctx.db.query("notificationEvents").collect());
  expect(events.map(event => event.eventType)).toEqual(["read", "deleted"]);
  expect(JSON.stringify(events)).not.toContain(row.message);
  expect(await recipient.query(api.notifications.unread, { expectedUserId: "recipient" })).toEqual([]);
});
it("lists only the actor's unread notifications in newest-first order with the existing 100-row limit", async () => {
  const t = create(); await t.run(async ctx => {
    for (let i = 0; i < 105; i++) await ctx.db.insert("notifications", { ...row, createdAt: i });
    await ctx.db.insert("notifications", { ...row, userId: "other", createdAt: 200 });
    await ctx.db.insert("notifications", { ...row, isDeleted: true, createdAt: 201 });
  });
  const result = await t.withIdentity({ subject: "recipient" }).query(api.notifications.unread, { expectedUserId: "recipient" });
  expect(result).toHaveLength(100); expect(result[0].createdAt).toBe(new Date(104).toISOString()); expect(result.every((item: any) => item.userId === "recipient")).toBe(true);
});
it("marks bounded pages through a fixed cutoff while preserving later and foreign notifications", async () => {
  const t = create(), recipient = t.withIdentity({ subject: "recipient" });
  await t.run(async ctx => { for (let i = 0; i < 205; i++) await ctx.db.insert("notifications", row); await ctx.db.insert("notifications", { ...row, createdAt: 20 }); await ctx.db.insert("notifications", { ...row, userId: "other" }); });
  const args = { expectedUserId: "recipient", through: 10 };
  expect(await recipient.mutation(api.notifications.markReadPage, args)).toEqual({ processed: 200, hasMore: true });
  expect(await recipient.mutation(api.notifications.markReadPage, args)).toEqual({ processed: 5, hasMore: false });
  expect(await recipient.mutation(api.notifications.markReadPage, args)).toEqual({ processed: 0, hasMore: false });
  expect(await t.run(ctx => ctx.db.query("notificationEvents").collect())).toHaveLength(205);
  expect(await recipient.query(api.notifications.unread, { expectedUserId: "recipient" })).toHaveLength(1);
});
it("rejects unauthenticated access and actor substitution", async () => {
  const t = create(); await expect(t.query(api.notifications.unread, { expectedUserId: "recipient" })).rejects.toThrow(/UNAUTHORIZED/);
  await expect(t.withIdentity({ subject: "other" }).query(api.notifications.unread, { expectedUserId: "recipient" })).rejects.toThrow(/FORBIDDEN/);
});
