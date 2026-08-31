import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const m = vi.hoisted(() => ({
  auth: vi.fn(), bypass: vi.fn(), admin: vi.fn(), roles: vi.fn(), owner: vi.fn(),
  listRoles: vi.fn(), updateRoles: vi.fn(), deleteRoles: vi.fn(), count: vi.fn(),
  audit: vi.fn(), writeAudit: vi.fn(), transaction: vi.fn(), clerk: vi.fn(),
  context: vi.fn(), flag: vi.fn(), intakes: vi.fn(),
}));
vi.mock("@/lib/adapters/auth/server", () => ({ auth: m.auth, isAuthBypassEnabled: m.bypass, clerkClient: m.clerk }));
vi.mock("@/lib/db", () => ({ db: {
  adminUser: { findFirst: m.admin },
  userRole: { findFirst: m.roles, findMany: m.listRoles, updateMany: m.updateRoles, deleteMany: m.deleteRoles, count: m.count },
  businessProfile: { findFirst: m.owner, findUnique: m.owner, count: m.count },
  aiInsightFailure: { count: m.count },
  inventoryIntake: { findMany: m.intakes },
  systemAuditLog: { findMany: m.audit, create: m.writeAudit },
  $transaction: m.transaction,
} }));
vi.mock("@/app/api/pos/_lib/server", () => ({ resolveAuthContext: m.context }));
vi.mock("@/lib/posthog/server-flags", () => ({ ensureServerFlag: m.flag }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));

import { getPlatformMetrics, getPlatformAudit } from "@/lib/platform/queries";
import { fetchAdminUsers } from "@/app/actions/admin-users";
import { updateUserRole } from "@/app/actions/user-management";
import { initiateRTBF } from "@/app/actions/rtbf";
import { POST as createBusiness } from "@/app/api/admin/businesses/route";
import { POST as createUser } from "@/app/api/admin/user/route";
import { PUT as updateUser, DELETE as deleteUser } from "@/app/api/admin/users/[id]/route";
import { GET as auditLogs } from "@/app/api/admin/audit-logs/route";
import { POST as deleteIdentity } from "@/app/api/v1/tenant/[tenantId]/user/[userId]/delete/route";
import { hasPermission, hasBusinessPermission } from "@/lib/auth/server-guards";
import { canManageNotificationRecipient } from "@/lib/auth/notification-access";
import { GET as getApprovals } from "@/app/api/inventory/intake/route";

const request = (url = "/api/admin/businesses", body = {}) => new NextRequest(`http://localhost${url}`, { method: "POST", body: JSON.stringify(body) });
describe("platform reads and writes reject tenant authority", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.auth.mockResolvedValue({ userId: "actor" }); m.bypass.mockReturnValue(false);
    m.admin.mockResolvedValue(null); m.roles.mockResolvedValue(null); m.owner.mockResolvedValue(null);
    m.context.mockResolvedValue({ userId: "actor", businessId: "business-a" });
    m.flag.mockResolvedValue(true); m.audit.mockResolvedValue([]);
  });

  it.each(["owner", "admin", "super_admin", "manager", "staff"])("does not infer platform grants from tenant %s", async role => {
    m.roles.mockResolvedValue({ role, permissions: { all: true, "users.manage_all": true } });
    m.owner.mockResolvedValue({ id: "business-a", ownerId: "actor" });
    await expect(getPlatformMetrics()).rejects.toThrow("Platform administrator");
    expect((await fetchAdminUsers()).data).toEqual([]);
    expect(await hasPermission("users.manage_all")).toBe(false);
    expect(await hasBusinessPermission("actor", "business-a", "users.manage_all")).toBe(false);
    expect(m.count).not.toHaveBeenCalled(); expect(m.listRoles).not.toHaveBeenCalled();
  });

  it("returns only operational counts for an explicit platform admin", async () => {
    m.admin.mockResolvedValue({ role: "super_admin" });
    m.count.mockResolvedValueOnce(10).mockResolvedValueOnce(8).mockResolvedValueOnce(25).mockResolvedValueOnce(2);
    expect(await getPlatformMetrics()).toEqual({ businesses: 10, activeBusinesses: 8, memberships: 25, aiFailures: 2 });
    expect(m.roles).not.toHaveBeenCalled();
  });
  it("platform audit selects no customer payloads and only platform events", async () => {
    m.admin.mockResolvedValue({ role: "super_admin" });
    await getPlatformAudit();
    expect(m.audit).toHaveBeenCalledWith({ where: { businessId: null }, select: { id: true, action: true, entityType: true, createdAt: true }, orderBy: { createdAt: "desc" }, take: 100 });
  });
  it("denies all global APIs and server actions before reads or mutations", async () => {
    m.roles.mockResolvedValue({ role: "owner" });
    expect((await createBusiness(request())).status).toBe(403);
    expect((await createUser(request())).status).toBe(403);
    const params = Promise.resolve({ id: "target" });
    expect((await updateUser(request(), { params })).status).toBe(403);
    expect((await deleteUser(request(), { params })).status).toBe(403);
    expect((await deleteIdentity(request(), { params: Promise.resolve({ tenantId: "business-a", userId: "target" }) })).status).toBe(403);
    expect((await updateUserRole("target", "manager", "business-a")).error).toBeTruthy();
    expect((await initiateRTBF("business-a", "target")).error).toBeTruthy();
    expect(m.transaction).not.toHaveBeenCalled(); expect(m.clerk).not.toHaveBeenCalled();
    expect(m.writeAudit).not.toHaveBeenCalled();
  });
  it("platform role updates cannot grant super_admin or silently update all businesses", async () => {
    m.admin.mockResolvedValue({ role: "super_admin" });
    expect((await updateUserRole("target", "super_admin", "business-a")).error).toBeTruthy();
    expect((await updateUserRole("target", "manager")).error).toBeTruthy();
    expect(m.transaction).not.toHaveBeenCalled();
  });
  it("updates exactly the selected business membership with an audit event", async () => {
    m.admin.mockResolvedValue({ role: "super_admin" }); m.owner.mockResolvedValue({ ownerId: "owner" });
    m.updateRoles.mockResolvedValue({ count: 1 });
    m.transaction.mockImplementation(fn => fn({ userRole: { updateMany: m.updateRoles }, systemAuditLog: { create: m.writeAudit } }));
    expect(await updateUserRole("target", "manager", "business-a")).toEqual({ success: true });
    expect(m.updateRoles).toHaveBeenCalledWith({ where: { userId: "target", businessId: "business-a", role: { notIn: ["owner", "super_admin"] } }, data: { role: "manager", permissions: {} } });
    expect(m.writeAudit).toHaveBeenCalledOnce();
  });
  it("tenant super_admin cannot request another business audit", async () => {
    m.roles.mockResolvedValue(null); m.owner.mockResolvedValue(null);
    const result = await auditLogs(new NextRequest("http://localhost/api/admin/audit-logs?business_id=business-b"));
    expect(result.status).toBe(403); expect(m.audit).not.toHaveBeenCalled();
  });
  it("business owners can still read their own business audit", async () => {
    m.owner.mockResolvedValue({ id: "business-a" });
    expect((await auditLogs(new NextRequest("http://localhost/api/admin/audit-logs"))).status).toBe(200);
    expect(m.audit).toHaveBeenCalledWith(expect.objectContaining({ where: { businessId: "business-a" } }));
  });
  it("a business owner cannot target an unrelated notification recipient", async () => {
    m.owner.mockResolvedValue({ id: "business-a" }); m.roles.mockResolvedValue(null);
    expect(await canManageNotificationRecipient(request(), "actor", "unrelated")).toBe(false);
    expect(m.roles).toHaveBeenCalledWith({ where: { userId: "unrelated", businessId: "business-a" }, select: { id: true } });
  });
  it("queries approvals only for the authorized business", async () => {
    m.owner.mockResolvedValue({ id: "business-a" }); m.intakes.mockResolvedValue([]);
    const result = await getApprovals(new NextRequest("http://localhost/api/inventory/intake"));
    expect(result.status).toBe(200);
    expect(m.intakes).toHaveBeenCalledWith(expect.objectContaining({ where: { businessId: "business-a" } }));
  });
  it("a platform grant alone gives no business approvals or business audit", async () => {
    m.admin.mockResolvedValue({ role: "super_admin" });
    m.context.mockResolvedValue({ userId: "actor", businessId: null });
    expect((await getApprovals(new NextRequest("http://localhost/api/inventory/intake"))).status).toBe(401);
    expect((await auditLogs(new NextRequest("http://localhost/api/admin/audit-logs"))).status).toBe(403);
    expect(m.intakes).not.toHaveBeenCalled(); expect(m.audit).not.toHaveBeenCalled();
  });
});
