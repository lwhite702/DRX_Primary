import type { InventoryMutationInput } from "@/lib/inventory/core/mutation-engine";

export function buildIntakeMutation(input: {
  businessId: string;
  inventoryId: string;
  actorUserId?: string | null;
  idempotencyKey: string;
  quantityGrams: number;
  sourceRef: string;
  gramFactor?: number;
}) : InventoryMutationInput {
  const factor = input.gramFactor ?? 1;
  const quantityUnits = factor > 0 ? input.quantityGrams / factor : input.quantityGrams;
  return {
    event: {
      businessId: input.businessId,
      inventoryId: input.inventoryId,
      eventType: "intake.approved",
      idempotencyKey: input.idempotencyKey,
      actorUserId: input.actorUserId,
      source: "inventory.intake",
      sourceRef: input.sourceRef,
      quantityDeltaUnits: quantityUnits,
      quantityDeltaGrams: input.quantityGrams,
    },
    stateDelta: {
      businessId: input.businessId,
      inventoryId: input.inventoryId,
      quantityDeltaUnits: quantityUnits,
      quantityDeltaGrams: input.quantityGrams,
    },
  };
}

type IntakeApplyRpcArgs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  businessId: string;
  inventoryId: string;
  intakeId: string;
  totalCost: number;
  totalWeightGrams: number;
  calculatedCostPerGram: number;
  deliveryCost?: number;
  supplier?: string;
  userId?: string;
  reasonSuffix?: string;
};

type IntakeApplyRpcResult = {
  success: boolean;
  already_processed: boolean;
  new_quantity_grams: number | null;
  error_message: string | null;
};

export async function applyIntakeMutationViaRpc({
  supabase,
  businessId,
  inventoryId,
  intakeId,
  totalCost,
  totalWeightGrams,
  calculatedCostPerGram,
  deliveryCost = 0,
  supplier,
  userId,
  reasonSuffix,
}: IntakeApplyRpcArgs): Promise<IntakeApplyRpcResult> {
  const { data, error } = await supabase.rpc("apply_inventory_intake_mutation", {
    p_business_id: businessId,
    p_inventory_id: inventoryId,
    p_intake_id: intakeId,
    p_total_cost: totalCost,
    p_total_weight_grams: totalWeightGrams,
    p_calculated_cost_per_gram: calculatedCostPerGram,
    p_delivery_cost: deliveryCost,
    p_supplier: supplier ?? null,
    p_user_id: userId ?? null,
    p_reason_suffix: reasonSuffix ?? null,
  });

  if (error) {
    throw new Error(`Failed to apply intake mutation RPC: ${error.message}`);
  }

  const row = Array.isArray(data) ? data[0] : null;
  if (!row || row.success !== true) {
    throw new Error(
      `Failed to apply intake mutation: ${row?.error_message ?? "Unknown error"}`,
    );
  }

  return row as IntakeApplyRpcResult;
}
