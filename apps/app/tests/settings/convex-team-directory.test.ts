import { expect, it } from "vitest";
import { convexTest } from "convex-test";
import schema from "../../convex/schema";
import { api } from "../../convex/_generated/api";
import * as onboarding from "../../convex/onboarding";
import * as members from "../../convex/members";
import * as team from "../../convex/teamManagement";
import * as generatedApi from "../../convex/_generated/api";
const modules = { "members.ts": async () => members, "onboarding.ts": async () => onboarding, "teamManagement.ts": async () => team, "_generated/api.js": async () => generatedApi };
it("paginates the authorized tenant directory without invitation secrets or personal preferences", async () => {
  const t = convexTest(schema, modules); const owner = t.withIdentity({ subject: "owner-a" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic team" });
  await t.run(async ctx => {
    for (let i = 0; i < 103; i++) await ctx.db.insert("users", { businessId, clerkUserId: `synthetic-${i}`, email: `synthetic-${i}@example.invalid`, status: "ACTIVE", role: "cashier", createdAt: i, updatedAt: i });
    await ctx.db.insert("users", { businessId, clerkUserId: "removed", email: "removed@example.invalid", status: "REMOVED", role: "cashier", createdAt: 1, updatedAt: 1 });
  });
  const rows: Array<{ id: string }> = []; let cursor: string | null = null;
  for (;;) {
    const page: { page: Array<{ id: string }>; isDone: boolean; continueCursor: string } = await owner.query(api.teamManagement.listTeamMembers, { businessId, expectedUserId: "owner-a", paginationOpts: { cursor, numItems: 40 } });
    expect(page.page.length).toBeLessThanOrEqual(40); rows.push(...page.page);
    if (page.isDone) break;
    cursor = page.continueCursor;
  }
  expect(rows).toHaveLength(104); expect(new Set(rows.map(row => row.id)).size).toBe(104);
  expect(JSON.stringify(rows)).not.toContain("dashboardPreferences");
  expect(JSON.stringify(rows)).not.toContain("removed@example.invalid");
});
it("denies staff directory access without permission and refuses cross-business selection", async () => {
  const t = convexTest(schema, modules); const owner = t.withIdentity({ subject: "owner-a" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic team" });
  const staff = t.withIdentity({ subject: "staff-a" });
  await t.run(ctx => ctx.db.insert("users", { businessId, clerkUserId: "staff-a", email: "staff@example.invalid", status: "ACTIVE", role: "cashier", createdAt: 1, updatedAt: 1 }));
  const args = { businessId, expectedUserId: "staff-a", paginationOpts: { cursor: null, numItems: 100 } };
  await expect(staff.query(api.teamManagement.listTeamMembers, args)).rejects.toThrow(/FORBIDDEN/);
  await expect(owner.query(api.teamManagement.listTeamMembers, args)).rejects.toThrow(/FORBIDDEN/);
  const other = t.withIdentity({ subject: "other-owner" });
  const otherBusiness = await other.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other" });
  await expect(owner.query(api.teamManagement.listTeamMembers, { ...args, expectedUserId: "owner-a", businessId: otherBusiness.businessId })).rejects.toThrow(/FORBIDDEN/);
});

it("changes roles atomically, protects self/owner/privileged targets, and revokes access on removal", async () => {
  const t = convexTest(schema, modules); const owner = t.withIdentity({ subject: "owner-a" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Synthetic team" });
  const [staffId, managerId] = await t.run(async ctx => {
    const insert = (clerkUserId: string, role: string) => ctx.db.insert("users", { businessId, clerkUserId, email: `${clerkUserId}@example.invalid`, status: "ACTIVE", role, createdAt: 1, updatedAt: 1 });
    return [await insert("staff-a", "cashier"), await insert("manager-a", "manager")];
  });
  const args = { businessId, expectedUserId: "owner-a", id: staffId };
  await owner.mutation(api.teamManagement.updateTeamRole, { ...args, role: "supervisor" });
  await owner.mutation(api.teamManagement.updateTeamRole, { ...args, role: "supervisor" });
  expect((await t.run(ctx => ctx.db.get(staffId)))!.role).toBe("supervisor");
  expect((await t.run(ctx => ctx.db.query("auditEvents").filter(q => q.eq(q.field("action"), "role_update")).collect()))).toHaveLength(1);
  await expect(owner.mutation(api.teamManagement.updateTeamRole, { ...args, id: "owner-a", role: "cashier" })).rejects.toThrow(/CONFLICT/);
  const manager = t.withIdentity({ subject: "manager-a" });
  await expect(manager.mutation(api.teamManagement.updateTeamRole, { ...args, expectedUserId: "manager-a", role: "admin" })).rejects.toThrow(/FORBIDDEN/);
  await expect(manager.mutation(api.teamManagement.removeTeamMember, { ...args, expectedUserId: "manager-a", id: "owner-a" })).rejects.toThrow(/OWNER_PROTECTED/);
  await owner.mutation(api.teamManagement.removeTeamMember, { ...args, id: managerId });
  await owner.mutation(api.teamManagement.removeTeamMember, { ...args, id: managerId });
  expect((await t.run(ctx => ctx.db.get(managerId)))!.status).toBe("REMOVED");
  await expect(manager.query(api.teamManagement.listTeamMembers, { businessId, expectedUserId: "manager-a", paginationOpts: { cursor: null, numItems: 100 } })).rejects.toThrow();
  expect((await t.run(ctx => ctx.db.query("auditEvents").filter(q => q.eq(q.field("action"), "remove_member")).collect()))).toHaveLength(1);
});

it("reads all member audit pages after removal without leaking other tenants or entity types", async () => {
  const t = convexTest(schema, modules);
  const owner = t.withIdentity({ subject: "owner-a" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Audit tenant" });
  const other = t.withIdentity({ subject: "owner-b" });
  const foreign = await other.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other audit tenant" });
  const targetId = await t.run(async ctx => {
    const id = await ctx.db.insert("users", { businessId, clerkUserId: "target", email: "target@example.invalid", status: "REMOVED", role: "cashier", createdAt: 1, updatedAt: 1 });
    await ctx.db.insert("users", { businessId, clerkUserId: "restricted", email: "restricted@example.invalid", status: "ACTIVE", role: "cashier", permissions: { "staff.manage": true }, createdAt: 1, updatedAt: 1 });
    for (let i = 0; i < 105; i++) await ctx.db.insert("auditEvents", { businessId, userId: "owner-a", action: "role_update", entityType: "team_member", entityId: "target", metadata: "{}", timestamp: i });
    await ctx.db.insert("auditEvents", { businessId: foreign.businessId, userId: "owner-b", action: "foreign", entityType: "team_member", entityId: "target", metadata: "{}", timestamp: 1000 });
    await ctx.db.insert("auditEvents", { businessId, userId: "owner-a", action: "other_entity", entityType: "customer", entityId: "target", metadata: "{}", timestamp: 1000 });
    return id;
  });
  const args = { businessId, expectedUserId: "owner-a", id: targetId, paginationOpts: { cursor: null, numItems: 100 } };
  const first = await owner.query(api.teamManagement.listTeamMemberAudit, args);
  expect(first.page).toHaveLength(100); expect(first.isDone).toBe(false);
  expect(first.page[0].createdAt).toBe(104);
  const last = await owner.query(api.teamManagement.listTeamMemberAudit, { ...args, paginationOpts: { cursor: first.continueCursor, numItems: 100 } });
  expect(last.page).toHaveLength(5); expect(last.isDone).toBe(true);
  expect([...first.page, ...last.page].every(event => event.action === "role_update")).toBe(true);
  await expect(t.withIdentity({ subject: "restricted" }).query(api.teamManagement.listTeamMemberAudit, { ...args, expectedUserId: "restricted" })).rejects.toThrow(/FORBIDDEN/);
  await expect(other.query(api.teamManagement.listTeamMemberAudit, { ...args, businessId: foreign.businessId, expectedUserId: "owner-b" })).rejects.toThrow(/NOT_FOUND/);
});

it("validates canonical invitations atomically and keeps tokens out of the shared directory", async () => {
  const t = convexTest(schema, modules); const owner = t.withIdentity({ subject: "owner-a" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Invitation tenant" });
  await t.run(async ctx => {
    for (const [clerkUserId, role, status] of [["staff", "MEMBER", "ACTIVE"], ["manager", "manager", "ACTIVE"], ["removed", "MEMBER", "REMOVED"]]) await ctx.db.insert("users", { businessId, clerkUserId, email: `${clerkUserId}@example.invalid`, role, status, dashboardPreferences: { preset: "operations", pinnedItemIds: [], version: 1 }, createdAt: 1, updatedAt: 1 });
  });
  await expect(owner.mutation(api.members.inviteMember, { email: "bad", role: "MEMBER" })).rejects.toThrow(/INVALID_ARGUMENT/);
  await expect(owner.mutation(api.members.inviteMember, { email: "new@example.invalid", role: "OWNER" })).rejects.toThrow(/INVALID_ARGUMENT/);
  await expect(owner.mutation(api.members.inviteMember, { email: "staff@example.invalid", role: "MEMBER" })).rejects.toThrow(/ALREADY_EXISTS/);
  await expect(t.withIdentity({ subject: "manager" }).mutation(api.members.inviteMember, { email: "new@example.invalid", role: "ADMIN" })).rejects.toThrow(/FORBIDDEN/);
  const invite = await owner.mutation(api.members.inviteMember, { email: " NEW@EXAMPLE.INVALID ", role: "MEMBER" });
  expect(invite.token).toMatch(/^[a-f0-9]{64}$/);
  await expect(owner.mutation(api.members.inviteMember, { email: "new@example.invalid", role: "MEMBER" })).rejects.toThrow(/ALREADY_EXISTS/);
  const ownerDirectory = await owner.query(api.members.listMembers, {});
  expect(ownerDirectory.invites).toHaveLength(1);
  expect(ownerDirectory.invites[0].email).toBe("new@example.invalid");
  expect(JSON.stringify(ownerDirectory)).not.toContain(invite.token);
  expect(JSON.stringify(ownerDirectory)).not.toContain("dashboardPreferences");
  expect(ownerDirectory.members.some(member => member.status === "REMOVED")).toBe(false);
  const staffDirectory = await t.withIdentity({ subject: "staff" }).query(api.members.listMembers, {});
  expect(staffDirectory.invites).toEqual([]);
  expect(staffDirectory.members.length).toBe(3);
  const audit = await t.run(ctx => ctx.db.query("auditEvents").filter(q => q.eq(q.field("action"), "invite_member")).collect());
  expect(audit).toHaveLength(1);
  expect(audit[0].metadata).toBe('{"role":"MEMBER"}');
});

it("accepts invitations only for the verified recipient and makes retries immutable", async () => {
  const t = convexTest(schema, modules); const owner = t.withIdentity({ subject: "owner-a" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Acceptance tenant" });
  const invite = await owner.mutation(api.members.inviteMember, { email: "recipient@example.invalid", role: "cashier" });
  const args = { businessId, token: invite.token };
  const recipient = t.withIdentity({ subject: "recipient", email: "recipient@example.invalid", emailVerified: true });
  await expect(t.withIdentity({ subject: "unverified", email: "recipient@example.invalid" }).mutation(api.members.acceptInvitation, args)).rejects.toThrow(/FORBIDDEN/);
  await expect(t.withIdentity({ subject: "wrong-email", email: "other@example.invalid", emailVerified: true }).mutation(api.members.acceptInvitation, args)).rejects.toThrow(/NOT_FOUND/);
  expect((await recipient.mutation(api.members.acceptInvitation, args)).status).toBe("accepted");
  expect((await recipient.mutation(api.members.acceptInvitation, args)).status).toBe("already_accepted");
  await expect(t.withIdentity({ subject: "another-identity", email: "recipient@example.invalid", emailVerified: true }).mutation(api.members.acceptInvitation, args)).rejects.toThrow(/FORBIDDEN/);
  const member = await t.run(ctx => ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", "recipient")).unique());
  expect(member).toMatchObject({ businessId, role: "cashier", status: "ACTIVE", isDefaultMembership: true });
  await owner.mutation(api.members.updateMemberRole, { targetUserId: member!._id, newRole: "supervisor" });
  await recipient.mutation(api.members.acceptInvitation, args);
  expect((await t.run(ctx => ctx.db.get(member!._id)))!.role).toBe("supervisor");
  const audit = await t.run(ctx => ctx.db.query("auditEvents").filter(q => q.eq(q.field("action"), "accept_team_invitation")).collect());
  expect(audit).toHaveLength(1); expect(audit[0].metadata).not.toContain(invite.token);
});

it("rejects wrong tenants and expires invitations without creating membership", async () => {
  const t = convexTest(schema, modules); const owner = t.withIdentity({ subject: "owner-a" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Expiry tenant" });
  const foreign = await t.withIdentity({ subject: "owner-b" }).mutation(api.onboarding.createBusinessOnboarding, { businessName: "Other tenant" });
  const invite = await owner.mutation(api.members.inviteMember, { email: "recipient@example.invalid", role: "MEMBER" });
  const recipient = t.withIdentity({ subject: "recipient", email: "recipient@example.invalid", emailVerified: true });
  await expect(recipient.mutation(api.members.acceptInvitation, { businessId: foreign.businessId, token: invite.token })).rejects.toThrow(/NOT_FOUND/);
  await t.run(ctx => ctx.db.patch(invite.inviteId, { expiresAt: 0 }));
  expect((await recipient.mutation(api.members.acceptInvitation, { businessId, token: invite.token })).status).toBe("expired");
  expect((await t.run(ctx => ctx.db.get(invite.inviteId)))!.status).toBe("EXPIRED");
  expect(await t.run(ctx => ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", "recipient")).first())).toBeNull();
});

it("preserves existing default tenancy and clears removed-member grants only on a fresh invitation", async () => {
  const t = convexTest(schema, modules); const owner = t.withIdentity({ subject: "owner-a" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Inviting tenant" });
  const recipient = t.withIdentity({ subject: "recipient", email: "recipient@example.invalid", emailVerified: true });
  const personal = await recipient.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Existing tenant" });
  const invite = await owner.mutation(api.members.inviteMember, { email: "recipient@example.invalid", role: "MEMBER" });
  await recipient.mutation(api.members.acceptInvitation, { businessId, token: invite.token });
  let rows = await t.run(ctx => ctx.db.query("users").withIndex("by_clerkUserId", q => q.eq("clerkUserId", "recipient")).collect());
  expect(rows.find(row => row.isDefaultMembership)!.businessId).toBe(personal.businessId);
  const joined = rows.find(row => row.businessId === businessId)!;
  await owner.mutation(api.teamManagement.removeTeamMember, { businessId, expectedUserId: "owner-a", id: joined._id });
  await t.run(ctx => ctx.db.patch(joined._id, { permissions: { "system.manage": true } }));
  await recipient.mutation(api.members.acceptInvitation, { businessId, token: invite.token });
  expect((await t.run(ctx => ctx.db.get(joined._id)))!.status).toBe("REMOVED");
  const reinvite = await owner.mutation(api.members.inviteMember, { email: "recipient@example.invalid", role: "cashier" });
  await recipient.mutation(api.members.acceptInvitation, { businessId, token: reinvite.token });
  expect(await t.run(ctx => ctx.db.get(joined._id))).toMatchObject({ status: "ACTIVE", role: "cashier", permissions: {} });
});

it("retains uncertain invitation deliveries and records a provider receipt idempotently", async () => {
  const t = convexTest(schema, modules); const owner = t.withIdentity({ subject: "owner-a" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Delivery tenant" });
  const context = { businessId, expectedUserId: "owner-a" };
  const invite = await owner.mutation(api.teamManagement.prepareTeamInvitation, { ...context, email: "recipient@example.invalid", role: "cashier" });
  const args = { ...context, inviteId: invite.inviteId };
  await owner.mutation(api.teamManagement.recordTeamInvitationDelivery, args);
  expect((await t.run(ctx => ctx.db.get(invite.inviteId)))!.deliveryStatus).toBe("UNKNOWN");
  await expect(owner.mutation(api.teamManagement.prepareTeamInvitation, { ...context, email: invite.email, role: "cashier" })).rejects.toThrow(/ALREADY_EXISTS/);
  await owner.mutation(api.teamManagement.recordTeamInvitationDelivery, { ...args, providerInvitationId: "provider-a" });
  await owner.mutation(api.teamManagement.recordTeamInvitationDelivery, { ...args, providerInvitationId: "provider-a" });
  await owner.mutation(api.teamManagement.recordTeamInvitationDelivery, args);
  expect(await t.run(ctx => ctx.db.get(invite.inviteId))).toMatchObject({ deliveryStatus: "SENT", providerInvitationId: "provider-a", status: "PENDING" });
  await expect(owner.mutation(api.teamManagement.recordTeamInvitationDelivery, { ...args, providerInvitationId: "provider-b" })).rejects.toThrow(/CONFLICT/);
  const events = await t.run(ctx => ctx.db.query("auditEvents").filter(q => q.eq(q.field("action"), "invitation_delivery")).collect());
  expect(events).toHaveLength(2);
});

it("allows business administrator to list team members, view invites, and invite team members", async () => {
  const t = convexTest(schema, modules); const owner = t.withIdentity({ subject: "owner-a" });
  const { businessId } = await owner.mutation(api.onboarding.createBusinessOnboarding, { businessName: "Admin tenant" });
  await t.run(ctx => ctx.db.insert("users", { businessId, clerkUserId: "admin-a", email: "admin@example.invalid", status: "ACTIVE", role: "ADMIN", createdAt: 1, updatedAt: 1 }));
  const admin = t.withIdentity({ subject: "admin-a" });
  const directory = await admin.query(api.members.listMembers, {});
  expect(directory.members).toHaveLength(2);
  const teamList = await admin.query(api.teamManagement.listTeamMembers, { businessId, expectedUserId: "admin-a", paginationOpts: { cursor: null, numItems: 50 } });
  expect(teamList.page).toHaveLength(2);
  const invite = await admin.mutation(api.members.inviteMember, { email: "cashier@example.invalid", role: "cashier" });
  expect(invite.token).toMatch(/^[a-f0-9]{64}$/);
  const inviteAdmin = await admin.mutation(api.teamManagement.prepareTeamInvitation, { businessId, expectedUserId: "admin-a", email: "newadmin@example.invalid", role: "admin" });
  expect(inviteAdmin.role).toBe("admin");
});
