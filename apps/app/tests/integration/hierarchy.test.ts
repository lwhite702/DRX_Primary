import { describe, it, expect, vi, beforeEach } from "vitest";
import { updateUserRole } from "@/app/actions/user-management";
const m = vi.hoisted(() => ({ grant: vi.fn(), business: vi.fn(), update: vi.fn(), audit: vi.fn(), tx: vi.fn() }));
vi.mock("@/lib/auth/platform-admin", () => ({ requirePlatformAdmin: m.grant }));
vi.mock("@/lib/db", () => ({ db: { businessProfile: { findUnique: m.business }, $transaction: m.tx } }));
describe("Platform and business role separation integration", () => {
  beforeEach(() => {
    vi.resetAllMocks();
    m.business.mockResolvedValue({ ownerId: "owner" });
    m.update.mockResolvedValue({ count: 1 });
    m.tx.mockImplementation(fn => fn({ userRole: { updateMany: m.update }, systemAuditLog: { create: m.audit } }));
  });
  it("blocks business managers from global role changes", async () => {
    m.grant.mockRejectedValue(new Error("Platform administrator access required"));
    expect((await updateUserRole("target", "manager", "tenant")).error).toBeTruthy();
    expect(m.update).not.toHaveBeenCalled();
  });
  it("allows explicit platform authority to update only a selected tenant role", async () => {
    m.grant.mockResolvedValue({ userId: "platform" });
    expect((await updateUserRole("target", "manager", "tenant")).success).toBe(true);
    expect(m.update).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ userId: "target", businessId: "tenant" }) }));
    expect(m.audit).toHaveBeenCalledOnce();
  });
  it("never grants platform access through business role management", async () => {
    m.grant.mockResolvedValue({ userId: "platform" });
    expect((await updateUserRole("target", "super_admin", "tenant")).error).toBeTruthy();
    expect(m.update).not.toHaveBeenCalled();
  });
});
