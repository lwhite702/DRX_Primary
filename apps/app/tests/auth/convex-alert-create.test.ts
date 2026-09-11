import { beforeEach, afterEach, expect, it, vi } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as notifications from "../../convex/notifications";
import * as notificationActions from "../../convex/notificationActions";
import * as generatedApi from "../../convex/_generated/api";
import { clearPostHogFlagCache } from "../../lib/flags/posthog-server-provider";
const create = () => convexTest(schema, { "notifications.ts": async () => notifications, "notificationActions.ts": async () => notificationActions, "_generated/api.js": async () => generatedApi });
const flags = { ops_notifications_alerts_write_enabled: true, feat_notifications_alert_write: true };
beforeEach(() => { clearPostHogFlagCache(); vi.stubEnv("POSTHOG_FLAG_OVERRIDES_JSON", JSON.stringify(flags)); vi.stubEnv("POSTHOG_PROJECT_API_KEY", ""); vi.stubEnv("NEXT_PUBLIC_POSTHOG_KEY", ""); });
afterEach(() => { vi.unstubAllEnvs(); clearPostHogFlagCache(); });
const args = { expectedUserId: "operator", targetUserId: "operator", requestId: "attempt", type: "alert", message: "Synthetic private message", metadataJson: '{"context":"Synthetic private context"}' };
it("atomically creates one alert and audit, retaining metadata only with the content", async () => {
  const t = create(), user = t.withIdentity({ subject: "operator" });
  const receipt = await user.action(api.notificationActions.createAlert, args);
  expect(await user.action(api.notificationActions.createAlert, args)).toEqual(receipt);
  await expect(user.action(api.notificationActions.createAlert, { ...args, message: "Changed" })).rejects.toThrow(/CONFLICT/);
  const rows = await t.run(ctx => ctx.db.query("notifications").collect()); expect(rows).toHaveLength(1); expect(rows[0].metadataJson).toBe(args.metadataJson);
  const audit = await t.run(ctx => ctx.db.query("notificationEvents").collect()); expect(audit).toHaveLength(1); expect(JSON.stringify(audit)).not.toContain("Synthetic private");
  await user.mutation(api.notifications.remove, { expectedUserId: "operator", notificationId: receipt.notificationId });
  expect(await user.action(api.notificationActions.createAlert, args)).toEqual(receipt);
  expect(await t.run(ctx => ctx.db.query("notifications").collect())).toHaveLength(0);
  expect(JSON.stringify(await t.run(ctx => ctx.db.query("notificationCreationReceipts").collect()))).not.toContain("Synthetic private");
});
it.each(Object.keys(flags))("blocks creation when %s is disabled", async flag => {
  vi.stubEnv("POSTHOG_FLAG_OVERRIDES_JSON", JSON.stringify({ ...flags, [flag]: false }));
  const t = create(); await expect(t.withIdentity({ subject: "operator" }).action(api.notificationActions.createAlert, args)).rejects.toThrow(/FEATURE_DISABLED/);
  expect(await t.run(ctx => ctx.db.query("notifications").collect())).toHaveLength(0);
});
it("rejects foreign recipients, substituted actors and oversized content without creation", async () => {
  const t = create(), user = t.withIdentity({ subject: "operator" });
  await expect(user.action(api.notificationActions.createAlert, { ...args, targetUserId: "foreign" })).rejects.toThrow();
  await expect(user.action(api.notificationActions.createAlert, { ...args, expectedUserId: "foreign" })).rejects.toThrow(/FORBIDDEN/);
  await expect(user.action(api.notificationActions.createAlert, { ...args, message: "a".repeat(8193) })).rejects.toThrow(/INVALID_ARGUMENT/);
  expect(await t.run(ctx => ctx.db.query("notifications").collect())).toHaveLength(0);
});
