import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const clerk = {
    organizations: {
      createOrganization: vi.fn(),
      deleteOrganization: vi.fn(),
      createOrganizationInvitation: vi.fn(),
      revokeOrganizationInvitation: vi.fn(),
      createOrganizationMembership: vi.fn(),
      updateOrganizationMembership: vi.fn(),
      deleteOrganizationMembership: vi.fn(),
    },
    users: {
      getUser: vi.fn(),
    },
  };

  return {
    resolveAuthContext: vi.fn(),
    hasBusinessPermission: vi.fn(),
    clerkClient: vi.fn(),
    clerk,
    db: {
      $transaction: vi.fn(),
      businessProfile: {
        findUnique: vi.fn(),
        updateMany: vi.fn(),
      },
      invite: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      systemAuditLog: {
        create: vi.fn(),
        findMany: vi.fn(),
      },
      user: {
        findFirst: vi.fn(),
        findUnique: vi.fn(),
      },
      userRole: {
        findFirst: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
        update: vi.fn(),
      },
    },
  };
});

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
}));

vi.mock("@/lib/auth/server-guards", () => ({
  hasBusinessPermission: mocks.hasBusinessPermission,
}));

vi.mock("@/lib/adapters/auth/server", () => ({
  clerkClient: mocks.clerkClient,
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

import { POST } from "@/app/api/team/members/route";
import { GET as GET_TEAM } from "@/app/api/team/route";
import { DELETE, GET } from "@/app/api/team/members/[id]/route";
import { GET as GET_MEMBER_AUDIT_LOGS } from "@/app/api/team/members/[id]/audit-logs/route";
import { PUT } from "@/app/api/team/members/[id]/role/route";

const routeContext = (id: string) => ({ params: Promise.resolve({ id }) });

function request(
  path: string,
  init: { method?: string; body?: Record<string, unknown> } = {},
) {
  return new NextRequest(`http://localhost${path}`, {
    method: init.method ?? "GET",
    headers: init.body ? { "Content-Type": "application/json" } : undefined,
    body: init.body ? JSON.stringify(init.body) : undefined,
  });
}

function membership(overrides: Record<string, unknown> = {}) {
  return {
    id: "membership-1",
    userId: "member-1",
    role: "cashier",
    permissions: {},
    createdAt: new Date("2026-08-19T12:00:00.000Z"),
    updatedAt: new Date("2026-08-19T12:00:00.000Z"),
    ...overrides,
  };
}

describe("tenant-scoped team member routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "actor-1",
      businessId: "business-1",
    });
    mocks.db.businessProfile.findUnique.mockResolvedValue({
      ownerId: "owner-1",
      isActive: true,
      clerkOrgId: "org_business_1",
      businessName: "DRX Store",
    });
    mocks.hasBusinessPermission.mockResolvedValue(true);
    mocks.clerkClient.mockResolvedValue(mocks.clerk);
    mocks.clerk.organizations.createOrganization.mockResolvedValue({
      id: "org_business_1",
    });
    mocks.clerk.organizations.createOrganizationInvitation.mockResolvedValue({
      id: "invitation-1",
    });
    mocks.clerk.organizations.revokeOrganizationInvitation.mockResolvedValue(
      {},
    );
    mocks.clerk.organizations.createOrganizationMembership.mockResolvedValue(
      {},
    );
    mocks.clerk.organizations.updateOrganizationMembership.mockResolvedValue(
      {},
    );
    mocks.clerk.organizations.deleteOrganizationMembership.mockResolvedValue(
      {},
    );
    mocks.db.invite.findFirst.mockResolvedValue(null);
    mocks.db.invite.create.mockResolvedValue({ id: "local-invite-1" });
    mocks.db.systemAuditLog.create.mockResolvedValue({ id: "audit-1" });
    mocks.db.systemAuditLog.findMany.mockResolvedValue([]);
    mocks.db.user.findUnique.mockResolvedValue(null);
    mocks.db.user.findFirst.mockResolvedValue(null);
    mocks.db.userRole.findFirst.mockResolvedValue(null);
    mocks.db.userRole.findMany.mockResolvedValue([]);
    mocks.db.userRole.delete.mockResolvedValue({});
    mocks.db.userRole.update.mockResolvedValue({});
    mocks.db.$transaction.mockImplementation(async (operations) =>
      Promise.all(operations),
    );
  });

  it("requires authentication before resolving business records", async () => {
    mocks.resolveAuthContext.mockResolvedValue({
      userId: null,
      businessId: null,
    });

    const response = await GET(
      request("/api/team/members/member-1?business_id=business-1"),
      routeContext("member-1"),
    );

    expect(response.status).toBe(401);
    expect(mocks.db.businessProfile.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.userRole.findFirst).not.toHaveBeenCalled();
  });

  it("blocks a business the authenticated actor cannot access before member lookup", async () => {
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "actor-1",
      businessId: null,
    });

    const response = await GET(
      request("/api/team/members/foreign?business_id=business-2"),
      routeContext("foreign"),
    );

    expect(response.status).toBe(403);
    expect(mocks.db.businessProfile.findUnique).not.toHaveBeenCalled();
    expect(mocks.db.userRole.findFirst).not.toHaveBeenCalled();
  });

  it("blocks a restricted operator before creating an external invitation", async () => {
    mocks.hasBusinessPermission.mockResolvedValue(false);

    const response = await POST(
      request("/api/team/members?business_id=business-1", {
        method: "POST",
        body: { email: "staff@example.com", role: "cashier" },
      }),
    );

    expect(response.status).toBe(403);
    expect(
      mocks.clerk.organizations.createOrganizationInvitation,
    ).not.toHaveBeenCalled();
    expect(mocks.db.invite.create).not.toHaveBeenCalled();
  });

  it("blocks staff managers from inviting administrators", async () => {
    mocks.hasBusinessPermission.mockImplementation(
      async (_userId, _businessId, permission) => permission === "staff.manage",
    );

    const response = await POST(
      request("/api/team/members?business_id=business-1", {
        method: "POST",
        body: { email: "admin@example.com", role: "admin" },
      }),
    );

    expect(response.status).toBe(403);
    expect(
      mocks.clerk.organizations.createOrganizationInvitation,
    ).not.toHaveBeenCalled();
    expect(mocks.db.invite.create).not.toHaveBeenCalled();
  });

  it("does not fall back to a global user lookup for a foreign member id", async () => {
    const response = await GET(
      request("/api/team/members/foreign?business_id=business-1"),
      routeContext("foreign"),
    );

    expect(response.status).toBe(404);
    expect(mocks.db.userRole.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          businessId: "business-1",
          OR: [{ id: "foreign" }, { userId: "foreign" }],
        },
      }),
    );
    expect(mocks.db.user.findFirst).not.toHaveBeenCalled();
    expect(mocks.clerk.users.getUser).not.toHaveBeenCalled();
  });

  it("lists only memberships from the selected business", async () => {
    mocks.db.userRole.findMany.mockResolvedValue([
      {
        ...membership(),
        businessId: "business-1",
      },
    ]);
    mocks.clerk.users.getUser.mockResolvedValue({
      primaryEmailAddress: { emailAddress: "staff@example.com" },
      primaryPhoneNumber: null,
    });

    const response = await GET_TEAM(
      request("/api/team?business_id=business-1"),
    );
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(mocks.db.userRole.findMany).toHaveBeenCalledWith({
      where: { businessId: "business-1" },
      orderBy: { createdAt: "desc" },
    });
    expect(payload.data).toHaveLength(1);
    expect(payload.data[0]).toEqual(
      expect.objectContaining({
        business_id: "business-1",
        user_id: "member-1",
        email: "staff@example.com",
      }),
    );
  });

  it("allows an authenticated business member to read the team list", async () => {
    mocks.hasBusinessPermission.mockResolvedValue(false);

    const response = await GET_TEAM(
      request("/api/team?business_id=business-1"),
    );

    expect(response.status).toBe(200);
    expect(mocks.db.userRole.findMany).toHaveBeenCalledWith({
      where: { businessId: "business-1" },
      orderBy: { createdAt: "desc" },
    });
  });

  it("removes only the selected business membership and records tenant audit data", async () => {
    mocks.db.userRole.findFirst.mockResolvedValue(membership());

    const response = await DELETE(
      request("/api/team/members/member-1?business_id=business-1", {
        method: "DELETE",
      }),
      routeContext("member-1"),
    );

    expect(response.status).toBe(204);
    expect(mocks.db.userRole.delete).toHaveBeenCalledWith({
      where: { id: "membership-1" },
    });
    expect(mocks.db.systemAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "remove_member",
        businessId: "business-1",
        entityId: "member-1",
        userId: "actor-1",
      }),
    });
    expect(
      mocks.clerk.organizations.deleteOrganizationMembership,
    ).toHaveBeenCalledWith({
      organizationId: "org_business_1",
      userId: "member-1",
    });
  });

  it("protects the owner membership from removal", async () => {
    mocks.db.userRole.findFirst.mockResolvedValue(
      membership({ userId: "owner-1", role: "owner" }),
    );

    const response = await DELETE(
      request("/api/team/members/owner-1?business_id=business-1", {
        method: "DELETE",
      }),
      routeContext("owner-1"),
    );

    expect(response.status).toBe(409);
    expect(mocks.db.userRole.delete).not.toHaveBeenCalled();
  });

  it("blocks staff managers from removing administrators", async () => {
    mocks.hasBusinessPermission.mockImplementation(
      async (_userId, _businessId, permission) => permission === "staff.manage",
    );
    mocks.db.userRole.findFirst.mockResolvedValue(
      membership({ userId: "admin-1", role: "admin" }),
    );

    const response = await DELETE(
      request("/api/team/members/admin-1?business_id=business-1", {
        method: "DELETE",
      }),
      routeContext("admin-1"),
    );

    expect(response.status).toBe(403);
    expect(mocks.db.userRole.delete).not.toHaveBeenCalled();
  });

  it("scopes member audit logs to the selected business membership", async () => {
    mocks.db.userRole.findFirst.mockResolvedValue(membership());

    const response = await GET_MEMBER_AUDIT_LOGS(
      request("/api/team/members/member-1/audit-logs?business_id=business-1"),
      routeContext("member-1"),
    );

    expect(response.status).toBe(200);
    expect(mocks.db.systemAuditLog.findMany).toHaveBeenCalledWith({
      where: {
        entityId: "member-1",
        businessId: "business-1",
      },
      orderBy: { createdAt: "desc" },
    });
  });

  it("requires audit permission before reading member audit logs", async () => {
    mocks.hasBusinessPermission.mockImplementation(
      async (_userId, _businessId, permission) => permission === "staff.manage",
    );

    const response = await GET_MEMBER_AUDIT_LOGS(
      request("/api/team/members/member-1/audit-logs?business_id=business-1"),
      routeContext("member-1"),
    );

    expect(response.status).toBe(403);
    expect(mocks.db.userRole.findFirst).not.toHaveBeenCalled();
    expect(mocks.db.systemAuditLog.findMany).not.toHaveBeenCalled();
  });

  it("does not read audit logs for a member outside the selected business", async () => {
    mocks.db.userRole.findFirst.mockResolvedValue(null);

    const response = await GET_MEMBER_AUDIT_LOGS(
      request("/api/team/members/foreign/audit-logs?business_id=business-1"),
      routeContext("foreign"),
    );

    expect(response.status).toBe(404);
    expect(mocks.db.systemAuditLog.findMany).not.toHaveBeenCalled();
  });

  it("creates a one-time invitation without accepting or generating a password", async () => {
    const response = await POST(
      request("/api/team/members?business_id=business-1", {
        method: "POST",
        body: {
          email: " Staff@Example.com ",
          name: "Store Operator",
          password: "must-not-be-used",
          role: "cashier",
        },
      }),
    );

    expect(response.status).toBe(201);
    expect(
      mocks.clerk.organizations.createOrganizationInvitation,
    ).toHaveBeenCalledWith({
      organizationId: "org_business_1",
      emailAddress: "staff@example.com",
      role: "org:member",
      expiresInDays: 7,
      inviterUserId: "actor-1",
      publicMetadata: {
        drxBusinessId: "business-1",
        drxInviteToken: expect.any(String),
        drxRole: "cashier",
        drxInvitedBy: "actor-1",
        drxInvitedName: "Store Operator",
      },
    });
    expect(mocks.db.invite.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        email: "staff@example.com",
        token: expect.any(String),
        tenantId: "business-1",
        role: "cashier",
        status: "PENDING",
        invitedBy: "actor-1",
      }),
    });
    expect(mocks.db.systemAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "invite_member",
        businessId: "business-1",
        entityId: "invitation-1",
      }),
    });
    const clerkMetadata =
      mocks.clerk.organizations.createOrganizationInvitation.mock.calls[0][0]
        .publicMetadata;
    const persistedInvite = mocks.db.invite.create.mock.calls[0][0].data;
    expect(persistedInvite.token).toBe(clerkMetadata.drxInviteToken);
    expect(
      mocks.clerk.organizations.revokeOrganizationInvitation,
    ).not.toHaveBeenCalled();
  });

  it("promotes a personal workspace to a Clerk organization before inviting", async () => {
    mocks.db.businessProfile.findUnique.mockResolvedValue({
      ownerId: "owner-1",
      isActive: true,
      clerkOrgId: "personal_owner-1",
      businessName: "DRX Store",
    });
    mocks.db.businessProfile.updateMany.mockResolvedValue({ count: 1 });
    mocks.db.userRole.findMany.mockResolvedValue([
      { userId: "owner-1", role: "owner" },
      { userId: "cashier-1", role: "cashier" },
      { userId: "admin-1", role: "admin" },
    ]);

    const response = await POST(
      request("/api/team/members?business_id=business-1", {
        method: "POST",
        body: { email: "staff@example.com", role: "cashier" },
      }),
    );

    expect(response.status).toBe(201);
    expect(mocks.clerk.organizations.createOrganization).toHaveBeenCalledWith({
      name: "DRX Store",
      createdBy: "owner-1",
    });
    expect(
      mocks.clerk.organizations.createOrganizationMembership,
    ).toHaveBeenCalledTimes(2);
    expect(
      mocks.clerk.organizations.createOrganizationMembership,
    ).toHaveBeenCalledWith({
      organizationId: "org_business_1",
      userId: "cashier-1",
      role: "org:member",
    });
    expect(
      mocks.clerk.organizations.createOrganizationMembership,
    ).toHaveBeenCalledWith({
      organizationId: "org_business_1",
      userId: "admin-1",
      role: "org:admin",
    });
    expect(
      mocks.clerk.organizations.createOrganizationMembership.mock
        .invocationCallOrder[1],
    ).toBeLessThan(
      mocks.db.businessProfile.updateMany.mock.invocationCallOrder[0],
    );
    expect(mocks.db.businessProfile.updateMany).toHaveBeenCalledWith({
      where: {
        id: "business-1",
        clerkOrgId: "personal_owner-1",
      },
      data: { clerkOrgId: "org_business_1" },
    });
  });

  it("rejects a non-object invitation payload", async () => {
    const response = await POST(
      new NextRequest(
        "http://localhost/api/team/members?business_id=business-1",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: "null",
        },
      ),
    );

    expect(response.status).toBe(400);
    expect(
      mocks.clerk.organizations.createOrganizationInvitation,
    ).not.toHaveBeenCalled();
  });

  it("rejects duplicate pending invitations before calling Clerk", async () => {
    mocks.db.invite.findFirst.mockResolvedValue({ id: "pending-1" });

    const response = await POST(
      request("/api/team/members?business_id=business-1", {
        method: "POST",
        body: { email: "staff@example.com", role: "cashier" },
      }),
    );

    expect(response.status).toBe(409);
    expect(mocks.clerkClient).not.toHaveBeenCalled();
  });

  it("revokes Clerk invitation when local persistence fails", async () => {
    const consoleError = vi
      .spyOn(console, "error")
      .mockImplementation(() => {});
    mocks.db.$transaction.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(
      request("/api/team/members?business_id=business-1", {
        method: "POST",
        body: { email: "staff@example.com", role: "cashier" },
      }),
    );

    expect(response.status).toBe(500);
    expect(
      mocks.clerk.organizations.revokeOrganizationInvitation,
    ).toHaveBeenCalledWith({
      organizationId: "org_business_1",
      invitationId: "invitation-1",
      requestingUserId: "actor-1",
    });
    consoleError.mockRestore();
  });

  it("updates the scoped membership and writes before-and-after role audit data", async () => {
    mocks.db.userRole.findFirst.mockResolvedValue(membership());

    const response = await PUT(
      request("/api/team/members/member-1/role?business_id=business-1", {
        method: "PUT",
        body: { role: "manager" },
      }),
      routeContext("member-1"),
    );

    expect(response.status).toBe(200);
    expect(mocks.db.userRole.update).toHaveBeenCalledWith({
      where: { id: "membership-1" },
      data: { role: "manager" },
    });
    expect(mocks.db.systemAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        businessId: "business-1",
        oldValues: { role: "cashier" },
        newValues: { role: "manager" },
      }),
    });
    expect(
      mocks.clerk.organizations.updateOrganizationMembership,
    ).toHaveBeenCalledWith({
      organizationId: "org_business_1",
      userId: "member-1",
      role: "org:member",
    });
  });

  it("rejects a non-object role payload", async () => {
    const response = await PUT(
      new NextRequest(
        "http://localhost/api/team/members/member-1/role?business_id=business-1",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: "null",
        },
      ),
      routeContext("member-1"),
    );

    expect(response.status).toBe(400);
    expect(mocks.db.userRole.update).not.toHaveBeenCalled();
  });

  it("rejects privileged or unknown roles", async () => {
    const response = await PUT(
      request("/api/team/members/member-1/role?business_id=business-1", {
        method: "PUT",
        body: { role: "owner" },
      }),
      routeContext("member-1"),
    );

    expect(response.status).toBe(400);
    expect(mocks.db.userRole.findFirst).not.toHaveBeenCalled();
    expect(mocks.db.userRole.update).not.toHaveBeenCalled();
  });

  it("blocks staff managers from assigning administrators", async () => {
    mocks.hasBusinessPermission.mockImplementation(
      async (_userId, _businessId, permission) => permission === "staff.manage",
    );

    const response = await PUT(
      request("/api/team/members/member-1/role?business_id=business-1", {
        method: "PUT",
        body: { role: "admin" },
      }),
      routeContext("member-1"),
    );

    expect(response.status).toBe(403);
    expect(mocks.db.userRole.findFirst).not.toHaveBeenCalled();
    expect(mocks.db.userRole.update).not.toHaveBeenCalled();
  });

  it("blocks staff managers from demoting administrators", async () => {
    mocks.hasBusinessPermission.mockImplementation(
      async (_userId, _businessId, permission) => permission === "staff.manage",
    );
    mocks.db.userRole.findFirst.mockResolvedValue(
      membership({ userId: "admin-1", role: "admin" }),
    );

    const response = await PUT(
      request("/api/team/members/admin-1/role?business_id=business-1", {
        method: "PUT",
        body: { role: "cashier" },
      }),
      routeContext("admin-1"),
    );

    expect(response.status).toBe(403);
    expect(mocks.db.userRole.update).not.toHaveBeenCalled();
  });
});
