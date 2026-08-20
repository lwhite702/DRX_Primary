import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => {
  const clerk = {
    invitations: {
      createInvitation: vi.fn(),
      revokeInvitation: vi.fn(),
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
      },
      invite: {
        findFirst: vi.fn(),
        create: vi.fn(),
      },
      systemAuditLog: {
        create: vi.fn(),
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
import {
  DELETE,
  GET,
} from "@/app/api/team/members/[id]/route";
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
    });
    mocks.hasBusinessPermission.mockResolvedValue(true);
    mocks.clerkClient.mockResolvedValue(mocks.clerk);
    mocks.clerk.invitations.createInvitation.mockResolvedValue({
      id: "invitation-1",
    });
    mocks.clerk.invitations.revokeInvitation.mockResolvedValue({});
    mocks.db.invite.findFirst.mockResolvedValue(null);
    mocks.db.invite.create.mockResolvedValue({ id: "local-invite-1" });
    mocks.db.systemAuditLog.create.mockResolvedValue({ id: "audit-1" });
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
    expect(mocks.clerk.invitations.createInvitation).not.toHaveBeenCalled();
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
    expect(mocks.clerkClient).not.toHaveBeenCalled();
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
    expect(mocks.clerk.invitations.createInvitation).toHaveBeenCalledWith({
      emailAddress: "staff@example.com",
      expiresInDays: 7,
      ignoreExisting: false,
      notify: true,
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
    const clerkMetadata = mocks.clerk.invitations.createInvitation.mock.calls[0][0]
      .publicMetadata;
    const persistedInvite = mocks.db.invite.create.mock.calls[0][0].data;
    expect(persistedInvite.token).toBe(clerkMetadata.drxInviteToken);
    expect(mocks.clerk.invitations.revokeInvitation).not.toHaveBeenCalled();
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
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.db.$transaction.mockRejectedValue(new Error("database unavailable"));

    const response = await POST(
      request("/api/team/members?business_id=business-1", {
        method: "POST",
        body: { email: "staff@example.com", role: "cashier" },
      }),
    );

    expect(response.status).toBe(500);
    expect(mocks.clerk.invitations.revokeInvitation).toHaveBeenCalledWith(
      "invitation-1",
    );
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
});
