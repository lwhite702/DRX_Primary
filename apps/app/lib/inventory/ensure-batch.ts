type BatchEnsureArgs = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any;
  businessId: string;
  inventoryId: string;
  intakeId: string;
  quantityGrams: number;
  unitCostPerGram: number;
  supplier?: string;
  createdBy?: string;
  receivedAtIso?: string;
};

function isDuplicateKeyError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const candidate = error as { code?: string; message?: string };
  return candidate.code === "23505" || candidate.message?.toLowerCase().includes("duplicate key") === true;
}

export async function ensureInventoryBatchForIntake({
  supabase,
  businessId,
  inventoryId,
  intakeId,
  quantityGrams,
  unitCostPerGram,
  supplier,
  createdBy,
  receivedAtIso,
}: BatchEnsureArgs): Promise<{ batchId: string; createdNow: boolean }> {
  const receivedAt = receivedAtIso ?? new Date().toISOString();

  const rpcPayload = {
    p_business_id: businessId,
    p_inventory_id: inventoryId,
    p_intake_id: intakeId,
    p_original_quantity_grams: quantityGrams,
    p_remaining_quantity_grams: quantityGrams,
    p_unit_cost_per_gram: unitCostPerGram,
    p_supplier: supplier ?? null,
    p_received_at: receivedAt,
    p_created_by: createdBy ?? null,
  };

  // Prefer RPC so intake->batch behavior is deterministic under concurrency.
  const { data: rpcBatchId, error: rpcError } = await supabase.rpc(
    "ensure_inventory_batch_for_intake",
    rpcPayload,
  );

  if (!rpcError && rpcBatchId) {
    return { batchId: String(rpcBatchId), createdNow: false };
  }

  // Fallback path for environments that have not migrated yet.
  const { data: existingBatch, error: existingBatchError } = await supabase
    .from("inventory_batches")
    .select("id")
    .eq("business_id", businessId)
    .eq("intake_id", intakeId)
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (existingBatchError) {
    throw new Error(`Failed to check existing intake batch: ${existingBatchError.message}`);
  }
  if (existingBatch?.id) {
    return { batchId: String(existingBatch.id), createdNow: false };
  }

  const batchRecord = {
    business_id: businessId,
    inventory_id: inventoryId,
    intake_id: intakeId,
    original_quantity_grams: quantityGrams,
    remaining_quantity_grams: quantityGrams,
    unit_cost_per_gram: unitCostPerGram,
    supplier: supplier ?? null,
    received_at: receivedAt,
    created_by: createdBy ?? null,
  };

  const { data: insertedBatch, error: insertError } = await supabase
    .from("inventory_batches")
    .insert(batchRecord)
    .select("id")
    .single();

  if (!insertError && insertedBatch?.id) {
    return { batchId: String(insertedBatch.id), createdNow: true };
  }

  if (isDuplicateKeyError(insertError)) {
    const { data: duplicateResolved, error: duplicateResolveError } = await supabase
      .from("inventory_batches")
      .select("id")
      .eq("business_id", businessId)
      .eq("intake_id", intakeId)
      .order("created_at", { ascending: true })
      .limit(1)
      .maybeSingle();

    if (duplicateResolveError || !duplicateResolved?.id) {
      throw new Error(
        `Batch conflicted but could not be reloaded: ${duplicateResolveError?.message ?? "Missing row"}`,
      );
    }
    return { batchId: String(duplicateResolved.id), createdNow: false };
  }

  throw new Error(
    `Failed to create or resolve inventory batch: ${insertError?.message ?? rpcError?.message ?? "Unknown error"}`,
  );
}
