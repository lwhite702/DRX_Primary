import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  tx: {
    $queryRaw: vi.fn(),
    customers: {
      findFirst: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
    },
    systemAuditLog: {
      create: vi.fn(),
    },
  },
  db: {
    $transaction: vi.fn(),
  },
  hashPhoneLookupCandidates: vi.fn(),
  hashEmailLookupCandidates: vi.fn(),
}));

vi.mock("@/lib/db", () => ({ db: mocks.db }));

vi.mock("@/lib/privacy/pii-hash", () => ({
  hashPhoneLookupCandidates: mocks.hashPhoneLookupCandidates,
  hashEmailLookupCandidates: mocks.hashEmailLookupCandidates,
}));

import {
  createCustomerWithAudit,
  CustomerConflictError,
  updateCustomerWithAudit,
} from "@/lib/customers/core/customer-lifecycle";

const createdCustomer = {
  id: "customer-1",
  businessId: "business-1",
  isActive: true,
  ephemeral: false,
  customerType: null,
};

describe("customer lifecycle integrity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.db.$transaction.mockImplementation(async (callback) =>
      callback(mocks.tx),
    );
    mocks.hashPhoneLookupCandidates.mockResolvedValue([]);
    mocks.hashEmailLookupCandidates.mockResolvedValue([]);
    mocks.tx.$queryRaw.mockResolvedValue([]);
  });

  it("rejects an active tenant-scoped duplicate before create or audit", async () => {
    mocks.hashPhoneLookupCandidates.mockResolvedValue(["phone-hash"]);
    mocks.tx.customers.findFirst.mockResolvedValue({ id: "existing-1" });

    await expect(
      createCustomerWithAudit({
        businessId: "business-1",
        actorUserId: "actor-1",
        phone: "5551234567",
        data: { id: "customer-1", businessId: "business-1" } as never,
        audit: {
          changedFields: ["phone"],
          isActive: true,
          ephemeral: false,
          customerType: null,
        },
      }),
    ).rejects.toEqual(
      expect.objectContaining({
        existingCustomerId: "existing-1",
      }),
    );

    expect(mocks.tx.customers.findFirst).toHaveBeenCalledWith({
      where: {
        businessId: "business-1",
        isActive: true,
        OR: [{ phoneHash: "phone-hash" }, { phoneNumber: "5551234567" }],
      },
      select: { id: true },
    });
    expect(mocks.tx.customers.create).not.toHaveBeenCalled();
    expect(mocks.tx.systemAuditLog.create).not.toHaveBeenCalled();
  });

  it("creates the customer and a PII-free audit in one locked transaction", async () => {
    mocks.hashEmailLookupCandidates.mockResolvedValue(["email-hash"]);
    mocks.tx.customers.findFirst.mockResolvedValue(null);
    mocks.tx.customers.create.mockResolvedValue(createdCustomer);

    const result = await createCustomerWithAudit({
      businessId: "business-1",
      actorUserId: "actor-1",
      email: "person@example.com",
      data: { id: "customer-1", businessId: "business-1" } as never,
      audit: {
        changedFields: ["alias", "email"],
        isActive: true,
        ephemeral: false,
        customerType: null,
      },
    });

    expect(result).toBe(createdCustomer);
    expect(mocks.tx.$queryRaw).toHaveBeenCalled();
    expect(mocks.tx.customers.create).toHaveBeenCalledTimes(1);
    expect(mocks.tx.systemAuditLog.create).toHaveBeenCalledWith({
      data: {
        action: "customer_created",
        entityType: "customer",
        entityId: "customer-1",
        businessId: "business-1",
        userId: "actor-1",
        newValues: {
          changedFields: ["alias", "email"],
          isActive: true,
          ephemeral: false,
          customerType: null,
        },
      },
    });
    expect(
      JSON.stringify(mocks.tx.systemAuditLog.create.mock.calls),
    ).not.toContain("person@example.com");
    expect(mocks.db.$transaction).toHaveBeenCalledWith(
      expect.any(Function),
      expect.objectContaining({ isolationLevel: "ReadCommitted" }),
    );
  });

  it("archives a tenant-scoped customer and records an immutable lifecycle event", async () => {
    mocks.tx.customers.findFirst.mockResolvedValue({
      ...createdCustomer,
      isActive: true,
    });
    mocks.tx.customers.update.mockResolvedValue({
      ...createdCustomer,
      isActive: false,
    });

    const result = await updateCustomerWithAudit({
      businessId: "business-1",
      actorUserId: "actor-1",
      customerId: "customer-1",
      data: { isActive: false },
      changedFields: ["is_active"],
    });

    expect(result.isActive).toBe(false);
    expect(mocks.tx.customers.findFirst).toHaveBeenCalledWith({
      where: { id: "customer-1", businessId: "business-1" },
    });
    expect(mocks.tx.systemAuditLog.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        action: "customer_archived",
        entityId: "customer-1",
        businessId: "business-1",
        userId: "actor-1",
        oldValues: expect.objectContaining({ isActive: true }),
        newValues: expect.objectContaining({
          changedFields: ["is_active"],
          isActive: false,
        }),
      }),
    });
  });

  it("blocks reactivation when an active identity conflict exists", async () => {
    mocks.hashEmailLookupCandidates.mockResolvedValue(["email-hash"]);
    mocks.tx.customers.findFirst
      .mockResolvedValueOnce({
        ...createdCustomer,
        isActive: false,
      })
      .mockResolvedValueOnce({ id: "existing-active" });

    await expect(
      updateCustomerWithAudit({
        businessId: "business-1",
        actorUserId: "actor-1",
        customerId: "customer-1",
        email: "person@example.com",
        data: { isActive: true },
        changedFields: ["is_active"],
      }),
    ).rejects.toBeInstanceOf(CustomerConflictError);

    expect(mocks.tx.customers.update).not.toHaveBeenCalled();
    expect(mocks.tx.systemAuditLog.create).not.toHaveBeenCalled();
  });

  it("treats a repeated lifecycle request as an idempotent no-op", async () => {
    mocks.tx.customers.findFirst.mockResolvedValue({
      ...createdCustomer,
      isActive: false,
    });

    const result = await updateCustomerWithAudit({
      businessId: "business-1",
      actorUserId: "actor-1",
      customerId: "customer-1",
      data: { isActive: false },
      changedFields: ["is_active"],
    });

    expect(result.isActive).toBe(false);
    expect(mocks.tx.customers.update).not.toHaveBeenCalled();
    expect(mocks.tx.systemAuditLog.create).not.toHaveBeenCalled();
  });
});
