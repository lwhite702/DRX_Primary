import { Prisma, type InventoryIntake } from "@prisma/client";
import { db } from "@/lib/db";

type TransactionClient = Prisma.TransactionClient;

export class InventoryIntakeError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

export type IntakeValues = {
  totalCost: number;
  totalWeightGrams: number;
  deliveryCost: number;
  supplier?: string;
};

function decimal(value: number) {
  return new Prisma.Decimal(value.toString());
}

const UUID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function isValidUuid(value: string): boolean {
  return typeof value === "string" && UUID_REGEX.test(value.trim());
}

async function lockInventory(
  tx: TransactionClient,
  inventoryId: string,
  businessId: string,
) {
  if (!isValidUuid(inventoryId) || !isValidUuid(businessId)) {
    throw new InventoryIntakeError("Inventory item not found", 404);
  }
  const rows = await tx.$queryRaw<Array<{ id: string }>>`
    SELECT id
    FROM inventory
    WHERE id = ${inventoryId}::uuid AND business_id = ${businessId}::uuid
    FOR UPDATE
  `;
  if (rows.length === 0) {
    throw new InventoryIntakeError("Inventory item not found", 404);
  }
}

async function applyIntake(
  tx: TransactionClient,
  intake: InventoryIntake,
  actorUserId: string,
  reasonSuffix = "",
) {
  await lockInventory(tx, intake.inventoryId, intake.businessId);

  const alreadyApplied = await tx.costHistory.findFirst({
    where: { intakeId: intake.id, businessId: intake.businessId },
    select: { id: true },
  });
  if (alreadyApplied) return;

  const quantityGrams = Number(intake.totalWeightGrams);
  const quantityUnits = Math.round(quantityGrams);
  const costPerGram = Number(intake.calculatedCostPerGram);

  const existingBatch = await tx.inventoryBatch.findFirst({
    where: { businessId: intake.businessId, intakeId: intake.id },
    orderBy: { createdAt: "asc" },
    select: { id: true },
  });
  if (!existingBatch) {
    await tx.inventoryBatch.create({
      data: {
        businessId: intake.businessId,
        inventoryId: intake.inventoryId,
        intakeId: intake.id,
        originalQuantityGrams: intake.totalWeightGrams,
        remainingQuantityGrams: intake.totalWeightGrams,
        unitCostPerGram: intake.calculatedCostPerGram,
        supplier: intake.supplier,
        createdBy: actorUserId,
      },
    });
  }

  await tx.inventory.update({
    where: { id: intake.inventoryId },
    data: {
      inventoryInGrams: { increment: intake.totalWeightGrams },
      quantityOnHand: { increment: quantityUnits },
      unitCost: decimal(costPerGram),
    },
  });
  await tx.costHistory.create({
    data: {
      businessId: intake.businessId,
      inventoryId: intake.inventoryId,
      intakeId: intake.id,
      costPerGram: intake.calculatedCostPerGram,
      totalCost: intake.totalCost,
      totalWeightGrams: intake.totalWeightGrams,
      deliveryCost: intake.deliveryCost,
      supplier: intake.supplier,
    },
  });
  await tx.inventoryLog.create({
    data: {
      inventoryId: intake.inventoryId,
      transactionType: "intake",
      quantityChange: quantityUnits,
      reason: intake.supplier
        ? `Intake from ${intake.supplier}${reasonSuffix}`
        : `Manual intake${reasonSuffix}`,
      createdBy: actorUserId,
    },
  });
  if (Number(intake.deliveryCost ?? 0) > 0) {
    await tx.inventoryLog.create({
      data: {
        inventoryId: intake.inventoryId,
        transactionType: "delivery_cost",
        quantityChange: 0,
        reason: `Delivery cost for intake${reasonSuffix}`,
        createdBy: actorUserId,
      },
    });
  }
}

export async function createInventoryIntake(input: {
  businessId: string;
  inventoryId: string;
  actorUserId: string;
  idempotencyKey: string;
  values: IntakeValues;
}) {
  const inventory = await db.inventory.findFirst({
    where: { id: input.inventoryId, businessId: input.businessId },
    select: { id: true },
  });
  if (!inventory) throw new InventoryIntakeError("Inventory item not found", 404);

  const since = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
  const historical = await db.costHistory.aggregate({
    where: {
      businessId: input.businessId,
      inventoryId: input.inventoryId,
      createdAt: { gte: since },
    },
    _avg: { costPerGram: true },
  });
  const calculatedCostPerGram =
    input.values.totalCost / input.values.totalWeightGrams;
  const averageCost = Number(historical._avg.costPerGram ?? 0);
  const requiresApproval =
    averageCost > 0 &&
    Math.abs((calculatedCostPerGram - averageCost) / averageCost) > 0.5;

  return db.$transaction(
    async (tx: TransactionClient) => {
      const lockKey = `inventory-intake:${input.businessId}:${input.idempotencyKey}`;
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtextextended(${lockKey}, 0))`;

      const replay = await tx.systemAuditLog.findFirst({
        where: {
          businessId: input.businessId,
          action: "inventory_intake_idempotency",
          entityType: "inventory_intake_request",
          entityId: input.idempotencyKey,
        },
        orderBy: { createdAt: "asc" },
      });
      const replayValues = replay?.newValues as { intakeId?: string } | null;
      if (replayValues?.intakeId) {
        const existing = await tx.inventoryIntake.findFirst({
          where: { id: replayValues.intakeId, businessId: input.businessId },
        });
        if (existing) {
          return { intake: existing, requiresApproval: existing.requiresApproval, replayed: true };
        }
      }

      await lockInventory(tx, input.inventoryId, input.businessId);
      let intake = await tx.inventoryIntake.create({
        data: {
          businessId: input.businessId,
          inventoryId: input.inventoryId,
          totalCost: decimal(input.values.totalCost),
          totalWeightGrams: decimal(input.values.totalWeightGrams),
          calculatedCostPerGram: decimal(calculatedCostPerGram),
          deliveryCost: decimal(input.values.deliveryCost),
          supplier: input.values.supplier,
          requiresApproval,
          status: "pending",
          createdBy: input.actorUserId,
        },
      });

      if (!requiresApproval) {
        await applyIntake(tx, intake, input.actorUserId);
        intake = await tx.inventoryIntake.update({
          where: { id: intake.id },
          data: {
            status: "approved",
            approvedBy: input.actorUserId,
            approvedAt: new Date(),
          },
        });
      }

      await tx.systemAuditLog.create({
        data: {
          action: "inventory_intake_idempotency",
          entityType: "inventory_intake_request",
          entityId: input.idempotencyKey,
          businessId: input.businessId,
          userId: input.actorUserId,
          newValues: { intakeId: intake.id },
        },
      });
      return { intake, requiresApproval, replayed: false };
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}

export async function canApproveInventoryIntake(
  userId: string,
  businessId: string,
) {
  const owned = await db.businessProfile.findFirst({
    where: { id: businessId, ownerId: userId },
    select: { id: true },
  });
  if (owned) return true;

  const membership = await db.userRole.findFirst({
    where: { userId, businessId },
    select: { role: true, permissions: true },
  });
  if (!membership) return false;
  const role = membership.role?.toLowerCase();
  const permissions = membership.permissions as Record<string, boolean> | null;
  return (
    role === "manager" ||
    role === "admin" ||
    role === "owner" ||
    role === "super_admin" ||
    permissions?.can_approve_intakes === true ||
    permissions?.["inventory.manage"] === true
  );
}

export async function decideInventoryIntake(input: {
  businessId: string;
  intakeId: string;
  actorUserId: string;
  action: "approve" | "reject";
  rejectionReason?: string;
  overrides?: Partial<IntakeValues>;
}) {
  if (!isValidUuid(input.intakeId) || !isValidUuid(input.businessId)) {
    throw new InventoryIntakeError("Intake not found", 404);
  }
  return db.$transaction(
    async (tx: TransactionClient) => {
      await tx.$queryRaw`
        SELECT id
        FROM inventory_intakes
        WHERE id = ${input.intakeId}::uuid AND business_id = ${input.businessId}::uuid
        FOR UPDATE
      `;
      let intake = await tx.inventoryIntake.findFirst({
        where: { id: input.intakeId, businessId: input.businessId },
      });
      if (!intake) throw new InventoryIntakeError("Intake not found", 404);

      if (input.action === "reject") {
        if (intake.status === "rejected") return intake;
        if (intake.status !== "pending") {
          throw new InventoryIntakeError(`Intake is already ${intake.status}`, 400);
        }
        return tx.inventoryIntake.update({
          where: { id: intake.id },
          data: {
            status: "rejected",
            approvedBy: input.actorUserId,
            approvedAt: new Date(),
            rejectionReason: input.rejectionReason,
          },
        });
      }

      if (intake.status === "approved") return intake;
      if (intake.status !== "pending") {
        throw new InventoryIntakeError(`Intake is already ${intake.status}`, 400);
      }

      if (input.overrides && Object.keys(input.overrides).length > 0) {
        const totalCost = input.overrides.totalCost ?? Number(intake.totalCost);
        const totalWeightGrams =
          input.overrides.totalWeightGrams ?? Number(intake.totalWeightGrams);
        intake = await tx.inventoryIntake.update({
          where: { id: intake.id },
          data: {
            totalCost: decimal(totalCost),
            totalWeightGrams: decimal(totalWeightGrams),
            calculatedCostPerGram: decimal(totalCost / totalWeightGrams),
            ...(input.overrides.deliveryCost !== undefined
              ? { deliveryCost: decimal(input.overrides.deliveryCost) }
              : {}),
            ...(input.overrides.supplier !== undefined
              ? { supplier: input.overrides.supplier }
              : {}),
          },
        });
      }

      await applyIntake(tx, intake, input.actorUserId, " (approved)");
      return tx.inventoryIntake.update({
        where: { id: intake.id },
        data: {
          status: "approved",
          approvedBy: input.actorUserId,
          approvedAt: new Date(),
        },
      });
    },
    { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
  );
}
