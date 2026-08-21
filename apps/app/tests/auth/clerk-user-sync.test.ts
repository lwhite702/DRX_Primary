import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  db: {
    $transaction: vi.fn(),
    businessProfile: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      create: vi.fn(),
    },
    invite: {
      findFirst: vi.fn(),
      updateMany: vi.fn(),
    },
    systemAuditLog: {
      create: vi.fn(),
    },
    user: {
      findUnique: vi.fn(),
      update: vi.fn(),
      create: vi.fn(),
    },
    userRole: {
      findFirst: vi.fn(),
      create: vi.fn(),
    },
  },
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

import {
  syncAcceptedClerkOrganizationInvitation,
  syncCreatedClerkOrganizationMembership,
  syncCreatedClerkUser,
} from "@/lib/auth/clerk-user-sync";

function createdUser(
  metadata: Record<string, unknown> | null = {
    drxBusinessId: "business-1",
    drxInviteToken: "token-1",
  },
) {
  return {
    id: "clerk-user-1",
    email_addresses: [{ email_address: " Staff@Example.com " }],
    first_name: "Store",
    last_name: "Operator",
    public_metadata: metadata,
  };
}

describe("Clerk user synchronization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.$transaction.mockImplementation(async (callback) =>
      callback(mocks.db),
    );
    mocks.db.invite.findFirst.mockResolvedValue({
      id: "invite-1",
      status: "PENDING",
      role: "cashier",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      invitedBy: "owner-1",
    });
    mocks.db.invite.updateMany.mockResolvedValue({ count: 1 });
    mocks.db.businessProfile.findUnique.mockResolvedValue({
      id: "business-1",
      isActive: true,
    });
    mocks.db.businessProfile.findFirst.mockResolvedValue({ id: "business-1" });
    mocks.db.user.findUnique.mockResolvedValue(null);
    mocks.db.user.create.mockResolvedValue({ id: "user-row-1" });
    mocks.db.user.update.mockResolvedValue({});
    mocks.db.userRole.findFirst.mockResolvedValue(null);
    mocks.db.userRole.create.mockResolvedValue({ id: "membership-1" });
    mocks.db.systemAuditLog.create.mockResolvedValue({ id: "audit-1" });
  });

  it("claims a pending invitation and attaches the new identity to that business", async () => {
    const result = await syncCreatedClerkUser(createdUser());

    expect(result).toBe("invitation_accepted");
    expect(mocks.db.invite.findFirst).toHaveBeenCalledWith({
      where: {
        token: "token-1",
        tenantId: "business-1",
        email: "staff@example.com",
      },
      select: expect.any(Object),
    });
    expect(mocks.db.invite.updateMany).toHaveBeenCalledWith({
      where: {
        id: "invite-1",
        status: "PENDING",
        expiresAt: { gt: expect.any(Date) },
      },
      data: { status: "ACCEPTED" },
    });
    expect(mocks.db.user.create).toHaveBeenCalledWith({
      data: {
        clerkUserId: "clerk-user-1",
        email: "staff@example.com",
        name: "Store Operator",
        role: "CASHIER",
        status: "ACTIVE",
        tenantId: "business-1",
      },
    });
    expect(mocks.db.userRole.create).toHaveBeenCalledWith({
      data: {
        businessId: "business-1",
        userId: "clerk-user-1",
        role: "cashier",
        permissions: {},
      },
    });
    expect(mocks.db.systemAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "accept_team_invitation",
        businessId: "business-1",
        entityId: "clerk-user-1",
        userId: "clerk-user-1",
        newValues: {
          role: "cashier",
          invitedBy: "owner-1",
        },
      }),
    });
    expect(mocks.db.businessProfile.create).not.toHaveBeenCalled();
  });

  it("does not duplicate membership when the invitation was already accepted", async () => {
    mocks.db.invite.findFirst.mockResolvedValue({
      id: "invite-1",
      status: "ACCEPTED",
      role: "cashier",
      expiresAt: new Date("2099-01-01T00:00:00.000Z"),
      invitedBy: "owner-1",
    });

    const result = await syncCreatedClerkUser(createdUser());

    expect(result).toBe("invitation_already_processed");
    expect(mocks.db.$transaction).not.toHaveBeenCalled();
    expect(mocks.db.userRole.create).not.toHaveBeenCalled();
  });

  it("treats a lost concurrent invitation claim as already processed", async () => {
    mocks.db.invite.updateMany.mockResolvedValue({ count: 0 });

    const result = await syncCreatedClerkUser(createdUser());

    expect(result).toBe("invitation_already_processed");
    expect(mocks.db.user.create).not.toHaveBeenCalled();
    expect(mocks.db.userRole.create).not.toHaveBeenCalled();
  });

  it("expires a stale invitation without provisioning access", async () => {
    mocks.db.invite.findFirst.mockResolvedValue({
      id: "invite-1",
      status: "PENDING",
      role: "cashier",
      expiresAt: new Date("2020-01-01T00:00:00.000Z"),
      invitedBy: "owner-1",
    });

    const result = await syncCreatedClerkUser(createdUser());

    expect(result).toBe("invitation_expired");
    expect(mocks.db.invite.updateMany).toHaveBeenCalledWith({
      where: { id: "invite-1", status: "PENDING" },
      data: { status: "EXPIRED" },
    });
    expect(mocks.db.userRole.create).not.toHaveBeenCalled();
  });

  it("keeps ordinary registration on the personal-workspace path", async () => {
    mocks.db.businessProfile.findUnique.mockResolvedValue(null);
    mocks.db.businessProfile.create.mockResolvedValue({ id: "personal-1" });

    const result = await syncCreatedClerkUser(createdUser(null));

    expect(result).toBe("personal_workspace_created");
    expect(mocks.db.businessProfile.create).toHaveBeenCalledWith({
      data: {
        businessName: "Store Operator's Workspace",
        ownerId: "clerk-user-1",
        clerkOrgId: "personal_clerk-user-1",
      },
      select: { id: true },
    });
    expect(mocks.db.user.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        clerkUserId: "clerk-user-1",
        tenantId: "personal-1",
        role: "OWNER",
      }),
    });
    expect(mocks.db.userRole.create).not.toHaveBeenCalled();
  });

  it("rejects incomplete invitation metadata instead of granting a personal workspace", async () => {
    await expect(
      syncCreatedClerkUser(createdUser({ drxBusinessId: "business-1" })),
    ).rejects.toThrow("metadata is incomplete");

    expect(mocks.db.$transaction).not.toHaveBeenCalled();
    expect(mocks.db.businessProfile.create).not.toHaveBeenCalled();
  });

  it("accepts an organization invitation into the matching DRX business", async () => {
    const result = await syncAcceptedClerkOrganizationInvitation({
      email_address: "staff@example.com",
      organization_id: "org_business_1",
      user_id: "clerk-user-1",
      public_metadata: {
        drxBusinessId: "business-1",
        drxInviteToken: "token-1",
      },
    });

    expect(result).toBe("invitation_accepted");
    expect(mocks.db.businessProfile.findFirst).toHaveBeenCalledWith({
      where: { id: "business-1", clerkOrgId: "org_business_1" },
      select: { id: true },
    });
    expect(mocks.db.userRole.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        businessId: "business-1",
        userId: "clerk-user-1",
        role: "cashier",
      }),
    });
  });

  it("uses organization membership events as an idempotent invite fallback", async () => {
    mocks.db.businessProfile.findUnique
      .mockReset()
      .mockResolvedValueOnce({ id: "business-1" })
      .mockResolvedValueOnce({ id: "business-1", isActive: true });

    const result = await syncCreatedClerkOrganizationMembership({
      organization: { id: "org_business_1" },
      public_user_data: {
        user_id: "clerk-user-1",
        identifier: "staff@example.com",
        first_name: "Store",
        last_name: "Operator",
      },
    });

    expect(result).toBe("invitation_accepted");
    expect(mocks.db.invite.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          tenantId: "business-1",
          email: "staff@example.com",
        },
        orderBy: { createdAt: "desc" },
      }),
    );
  });
});
