import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  resolveAuthContext: vi.fn(),
  hasBusinessPermission: vi.fn(),
  findMembership: vi.fn(),
  updateMembership: vi.fn(),
  createAuditLog: vi.fn(),
}));

vi.mock("@/app/api/pos/_lib/server", () => ({
  resolveAuthContext: mocks.resolveAuthContext,
}));

vi.mock("@/lib/auth/server-guards", () => ({
  hasBusinessPermission: mocks.hasBusinessPermission,
}));

vi.mock("@/lib/db", () => ({
  db: {
    userRole: {
      findFirst: mocks.findMembership,
      update: mocks.updateMembership,
    },
    systemAuditLog: { create: mocks.createAuditLog },
  },
}));

import { PUT } from "@/app/api/team/members/[id]/role/route";

function makeRequest(role: string) {
  return new NextRequest("http://localhost/api/team/members/user_2/role", {
    method: "PUT",
    headers: {
      "content-type": "application/json",
      "x-business-id": "business_1",
    },
    body: JSON.stringify({ role }),
  });
}

describe("PUT /api/team/members/[id]/role", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.resolveAuthContext.mockResolvedValue({
      userId: "user_1",
      businessId: "business_1",
    });
    mocks.hasBusinessPermission.mockResolvedValue(true);
    mocks.findMembership.mockResolvedValue({
      id: "membership_1",
      role: "cashier",
    });
    mocks.updateMembership.mockResolvedValue({ id: "membership_1" });
    mocks.createAuditLog.mockResolvedValue({ id: "audit_1" });
  });

  it("updates only the target membership in the selected business", async () => {
    const request = makeRequest("supervisor");
    const response = await PUT(request, {
      params: Promise.resolve({ id: "user_2" }),
    });

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({
      id: "user_2",
      role: "supervisor",
    });
    expect(mocks.resolveAuthContext).toHaveBeenCalledWith(request);
    expect(mocks.hasBusinessPermission).toHaveBeenCalledWith(
      "user_1",
      "business_1",
      "staff.manage",
    );
    expect(mocks.findMembership).toHaveBeenCalledWith({
      where: { userId: "user_2", businessId: "business_1" },
      select: { id: true, role: true },
    });
    expect(mocks.updateMembership).toHaveBeenCalledWith({
      where: { id: "membership_1" },
      data: { role: "supervisor" },
    });
  });

  it("does not allow owner roles to be changed", async () => {
    mocks.findMembership.mockResolvedValue({
      id: "membership_1",
      role: "owner",
    });

    const response = await PUT(makeRequest("manager"), {
      params: Promise.resolve({ id: "user_2" }),
    });

    expect(response.status).toBe(403);
    expect(mocks.updateMembership).not.toHaveBeenCalled();
    expect(mocks.createAuditLog).not.toHaveBeenCalled();
  });
});
