import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { Webhook } from "svix";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as webhooks from "../../convex/clerkWebhooks";
import * as identityEvents from "../../convex/clerkIdentityEvents";
import * as events from "../../convex/clerkMembershipEvents";
import * as members from "../../convex/members";
import * as onboarding from "../../convex/onboarding";
import * as generatedApi from "../../convex/_generated/api";
const modules = { "clerkIdentityEvents.ts": async () => identityEvents, "clerkWebhooks.ts": async () => webhooks, "clerkMembershipEvents.ts": async () => events, "members.ts": async () => members, "onboarding.ts": async () => onboarding, "_generated/api.js": async () => generatedApi };
const secret = "whsec_" + Buffer.from("synthetic-test-signing-key-only").toString("base64");
beforeEach(() => { vi.stubEnv("CLERK_WEBHOOK_SECRET", secret); });
afterEach(() => { vi.unstubAllEnvs(); });
function envelope(data: Record<string, unknown>) {
  const body = JSON.stringify({ type: "user.created", data }), now = new Date();
  return { body, svixId: "synthetic-event", svixTimestamp: Math.floor(now.getTime() / 1000).toString(), svixSignature: new Webhook(secret).sign("synthetic-event", now, body) };
}
async function fixture() {
  const t = convexTest(schema, modules), owner = t.withIdentity({ subject: "owner" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic webhook tenant" });
  const invite = await owner.mutation(api.members.inviteMember, { email: "staff@example.invalid", role: "cashier" });
  const data = { id: "recipient", primary_email_address_id: "email-1", email_addresses: [{ id: "email-1", email_address: "staff@example.invalid", verification: { status: "verified" } }], public_metadata: { drxBusinessId: businessId, drxInviteToken: invite.token, drxRole: "OWNER" } };
  return { t, businessId, invite, data };
}
it("accepts a verified signed invitation using its stored role and ignores replay", async () => {
  const { t, data, businessId } = await fixture(); const signed = envelope(data);
  expect(await t.action(api.clerkWebhooks.userCreated, signed)).toBe("accepted");
  expect(await t.action(api.clerkWebhooks.userCreated, signed)).toBe("already_accepted");
  const rows = await t.run(ctx => ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", "recipient")).collect());
  expect(rows).toHaveLength(1); expect(rows[0]).toMatchObject({ businessId, role: "cashier", status: "ACTIVE" });
  expect(await t.run(ctx => ctx.db.query("auditEvents").filter(q => q.eq(q.field("action"), "accept_team_invitation")).collect())).toHaveLength(1);
});
it("does not grant access for tampered signatures, unverified email, or a different recipient", async () => {
  const { t, data } = await fixture();
  await expect(t.action(api.clerkWebhooks.userCreated, { ...envelope(data), body: JSON.stringify({ type: "user.created", data: { ...data, id: "attacker" } }) })).rejects.toThrow(/UNAUTHORIZED/);
  await expect(t.action(api.clerkWebhooks.userCreated, envelope({ ...data, email_addresses: [{ ...data.email_addresses[0], verification: { status: "unverified" } }] }))).rejects.toThrow(/FORBIDDEN/);
  await expect(t.action(api.clerkWebhooks.userCreated, envelope({ ...data, email_addresses: [{ ...data.email_addresses[0], email_address: "other@example.invalid" }] }))).rejects.toThrow(/NOT_FOUND/);
  expect(await t.run(ctx => ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", "recipient")).first())).toBeNull();
});
it("expires stale invitations without provisioning a member", async () => {
  const { t, data, invite } = await fixture();
  await t.run(ctx => ctx.db.patch(invite.inviteId, { expiresAt: 0 }));
  expect(await t.action(api.clerkWebhooks.userCreated, envelope(data))).toBe("expired");
  expect(await t.run(ctx => ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", "recipient")).first())).toBeNull();
});
it("leaves ordinary signup to canonical onboarding and refuses partial invitation metadata", async () => {
  const { t, data } = await fixture();
  expect(await t.action(api.clerkWebhooks.userCreated, envelope({ ...data, public_metadata: {} }))).toBe("awaiting_onboarding");
  await expect(t.action(api.clerkWebhooks.userCreated, envelope({ ...data, public_metadata: { drxBusinessId: data.public_metadata.drxBusinessId } }))).rejects.toThrow(/INVALID_ARGUMENT/);
  expect(await t.run(ctx => ctx.db.query("businesses").collect())).toHaveLength(1);
});
it("allows webhook replay after authenticated acceptance without duplicating membership", async () => {
  const { t, data, invite, businessId } = await fixture();
  await t.withIdentity({ subject: "recipient", email: "staff@example.invalid", emailVerified: true }).mutation(api.members.acceptInvitation, { token: invite.token, businessId });
  expect(await t.action(api.clerkWebhooks.userCreated, envelope(data))).toBe("already_accepted");
});

it("converges overlapping webhook deliveries on one membership and acceptance audit", async () => {
  const { t, data } = await fixture(); const signed = envelope(data);
  const results = await Promise.all([t.action(api.clerkWebhooks.userCreated, signed), t.action(api.clerkWebhooks.userCreated, signed)]);
  expect(results.sort()).toEqual(["accepted", "already_accepted"]);
  expect(await t.run(ctx => ctx.db.query("auditEvents").filter(q => q.eq(q.field("action"), "accept_team_invitation")).collect())).toHaveLength(1);
});


it("records signed session events once without storing arbitrary payloads or granting access", async () => {
  const { t } = await fixture();
  const body = JSON.stringify({ type: "session.created", timestamp: 123, data: { id: "session-a", user_id: "recipient", latest_activity: { city: "Synthetic", device_type: "desktop" }, arbitrarySecret: "must-not-store" } });
  const now = new Date(); const signed = { body, svixId: "session-event", svixTimestamp: Math.floor(now.getTime() / 1000).toString(), svixSignature: new Webhook(secret).sign("session-event", now, body) };
  expect(await t.action(api.clerkWebhooks.handle, signed)).toBe("recorded");
  expect(await t.action(api.clerkWebhooks.handle, signed)).toBe("already_recorded");
  const records = await t.run(ctx => ctx.db.query("authSessionEvents").collect());
  expect(records).toHaveLength(1); expect(records[0]).toMatchObject({ userId: "recipient", sessionId: "session-a", city: "Synthetic", occurredAt: 123 });
  expect(JSON.stringify(records)).not.toContain("must-not-store");
  expect(await t.run(ctx => ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", "recipient")).first())).toBeNull();
});
it("records organization identity once and leaves business provisioning to onboarding", async () => {
  const { t } = await fixture(); const now = new Date();
  const body = JSON.stringify({ type: "organization.created", data: { id: "org-synthetic", name: "Synthetic org", created_by: "recipient" } });
  const signed = { body, svixId: "org-event", svixTimestamp: Math.floor(now.getTime() / 1000).toString(), svixSignature: new Webhook(secret).sign("org-event", now, body) };
  expect(await t.action(api.clerkWebhooks.handle, signed)).toBe("recorded");
  expect(await t.action(api.clerkWebhooks.handle, signed)).toBe("already_recorded");
  expect(await t.run(ctx => ctx.db.query("clerkOrganizations").collect())).toHaveLength(1);
  expect(await t.run(ctx => ctx.db.query("businesses").collect())).toHaveLength(1);
});
