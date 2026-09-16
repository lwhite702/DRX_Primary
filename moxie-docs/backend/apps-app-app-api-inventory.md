# Inventory intake and adjustment API

These Next.js API routes manage on-hand inventory counts and inbound intake events. They enforce safety invariants (no negative stock), create audit trails, and coordinate approval and mutation flows against Supabase tables and RPCs.

## Architecture

- Entry points
  - POST /api/inventory/adjust → `apps/app/app/api/inventory/adjust/route.ts`
  - POST /api/inventory/intake → `apps/app/app/api/inventory/intake/route.ts`
- Shared services
  - Supabase server client via `@/lib/supabase/server` for auth, table reads/writes, and RPC.
- Data flow
  - Adjust: validate payload → authenticate user → read `inventory` → compute `newQuantity` and enforce non-negative → update `inventory` → insert `inventory_log` audit → on failure, rollback inventory update.
  - Intake: validate payload → authenticate user → read `inventory` → compute `calculated_cost_per_gram` and query `get_avg_cost_per_gram` RPC → insert `inventory_intakes` (potentially requires approval) → if auto-approved, call `processIntake()` which ensures an intake batch, applies mutation via RPC, and cleans up on failure → mark intake approved.
- Supporting modules used by intake
  - `@/lib/inventory/ensure-batch` → `ensureInventoryBatchForIntake(...)` returns `{ batchId, createdNow }` to create or reuse an `inventory_batches` record.
  - `@/lib/inventory/mutations/apply-intake` → `applyIntakeMutationViaRpc(...)` performs the atomic stock/cost mutation within the database.

## apps/app/app/api/inventory/adjust/route.ts (POST /api/inventory/adjust)

Responsibility
- Adjusts the on-hand quantity of a single inventory item and writes an audit record. Enforces non-negative resulting quantity. If the audit insert fails, the inventory update is rolled back.

Auth/authorization
- Requires an authenticated Supabase user: `supabase.auth.getUser()`; returns 401 Unauthorized if not present.
- No explicit role check is implemented in the route; comments note RLS or future permission checks (e.g., “inventory.adjust”).

Inputs (JSON body)
- `inventory_id` (string, required) — target inventory row id.
- `type` ("set" | "delta", required) — operation mode.
- `value` (number, required) — either the absolute quantity (when `type` == "set") or the increment/decrement (when `type` == "delta").
- `reason` (string, required) — audit reason.

Validation errors
- 400 `{ error: "inventory_id is required" }`
- 400 `{ error: "value must be a number" }`
- 400 `{ error: "reason is required" }`

Behavior
- Loads current item: `from("inventory").select("quantity_on_hand, business_id").eq("id", inventory_id).single()`.
  - If not found: 404 `{ error: "Inventory item not found" }`.
- Computes `newQuantity` and `delta`:
  - If `type === "set"`: `newQuantity = value`; `delta = newQuantity - item.quantity_on_hand`.
  - Else: `delta = value`; `newQuantity = item.quantity_on_hand + delta`.
- Enforces non-negative stock:
  - If `newQuantity < 0`: 400 `{ error: "Adjustment would result in negative stock (<value>)" }`.
- Updates inventory:
  - `from("inventory").update({ quantity_on_hand: newQuantity, updated_at: <iso> }).eq("id", inventory_id)`.
  - On failure: 500 `{ error: "Failed to update inventory" }`.
- Inserts audit log:
  - Table: `inventory_log` with fields `{ inventory_id, business_id, transaction_type: "adjustment", quantity_change: delta, reason, created_by: user.id, metadata: { type, original_value, new_value } }`.
  - If the audit insert fails, attempts best-effort rollback of the `inventory` row to the original `quantity_on_hand` and updated timestamp. Logs rollback error to console if that also fails.
  - Responds 500 `{ error: "Failed to write audit log for adjustment" }` if log insert fails.

Success response
- 200 `{ success: true, new_quantity: <number>, delta: <number> }`.

Notable error cases
- 401 Unauthorized if no user.
- 404 if target inventory row not found.
- 400 on invalid or negative-resulting adjustments.
- 500 on DB update/logging failures; attempts rollback when logging fails.

Side effects and contracts
- Writes to `inventory` and `inventory_log` only after user auth.
- Guarantees: no persistent quantity change without a corresponding audit log entry (via rollback on log failure).

## apps/app/app/api/inventory/intake/route.ts (POST /api/inventory/intake)

Responsibility
- Creates an intake record for inbound stock with cost/weight details, enforces basic validations, compares cost-per-gram to historical averages via RPC, and either queues for approval or auto-applies the mutation to inventory using database-level RPCs and batch records.

Auth/authorization
- Requires an authenticated Supabase user: `supabase.auth.getUser()`; returns 401 Unauthorized if not present.
- Access to the inventory item is implicitly governed by the `inventory` query and any RLS policies; no explicit role check here.

Inputs (JSON body)
- `inventory_id` (string, required)
- `total_cost` (number, required, must be > 0)
- `total_weight_grams` (number, required, must be >= 0.01)
- `delivery_cost` (number, optional, defaults to 0, must be >= 0)
- `supplier` (string, optional)

Validation errors
- 400 `{ error: "inventory_id is required" }`
- 400 `{ error: "total_cost must be greater than 0" }`
- 400 `{ error: "total_weight_grams must be at least 0.01" }`
- 400 `{ error: "delivery_cost cannot be negative" }`

Behavior
- Loads inventory item: `from("inventory").select("id, business_id, product_name, unit_cost").eq("id", inventory_id).single()`.
  - If not found: 404 `{ error: "Inventory item not found" }`.
- Computes `calculated_cost_per_gram = total_cost / total_weight_grams`.
- Attempts to fetch 90-day average cost via RPC: `supabase.rpc("get_avg_cost_per_gram", { p_inventory_id: inventory_id, p_days: 90 })`.
  - If RPC errors, logs a warning and continues with `avg_cost = 0`.
- Determines approval requirement:
  - If `avg_cost > 0` and relative deviation `|calculated - avg| / avg > 0.5`, sets `requires_approval = true` and `status = "pending"`.
  - Otherwise, defaults to auto-approve path (initial `status = "pending"`, then processed and marked approved below).
- Inserts intake record into `inventory_intakes`:
  - Fields: `{ business_id, inventory_id, total_cost, total_weight_grams, calculated_cost_per_gram, delivery_cost, supplier, requires_approval, status, created_by: user.id }`.
  - Returns 500 `{ error: "Failed to create intake record" }` on failure.
- If `!requires_approval` (auto-approve flow):
  1) Calls `processIntake(supabase, intake.id, inventory_id, business_id, { total_cost, total_weight_grams, calculated_cost_per_gram, delivery_cost, supplier, user_id: user.id })` to apply stock/cost updates.
  2) Updates the same `inventory_intakes` row to mark as approved: `{ status: "approved", approved_by: user.id, approved_at: <iso>, updated_at: <iso> }`.
     - On failure to finalize approval: 500 `{ error: "Failed to finalize intake approval" }`.

Success response
- 200 `{ success: true, intake, requires_approval, message }` where `message` is either "Intake submitted for manager approval due to unusual cost" or "Inventory successfully updated and approved".

Helper: processIntake(supabase, intake_id, inventory_id, business_id, data)
- Ensures a batch for this intake using `ensureInventoryBatchForIntake({ supabase, businessId, inventoryId, intakeId, quantityGrams, unitCostPerGram, supplier, createdBy, receivedAtIso })`.
  - Returns `{ batchId: ensuredBatchId, createdNow }`.
- Applies the intake mutation using `applyIntakeMutationViaRpc({ supabase, businessId, inventoryId, intakeId, totalCost, totalWeightGrams, calculatedCostPerGram, deliveryCost, supplier, userId, reasonSuffix: "" })`.
- Error handling/compensation:
  - If `applyIntakeMutationViaRpc` throws and the batch was just created in this request (`createdNow === true`), deletes that `inventory_batches` row: `from("inventory_batches").delete().eq("id", ensuredBatchId).eq("intake_id", intake_id)`.
  - Re-throws the error to propagate failure to the caller.

Side effects and contracts
- Writes to `inventory_intakes` always; writes to `inventory_batches` and inventory mutation paths only if auto-approved or later when an approval flow calls the same logic.
- Uses RPCs to centralize business invariants and cost calculations; route treats them as the source of truth and applies compensation only for local batch creation.

## Gotchas

- Negative stock is hard-blocked in adjust: any adjustment resulting in `newQuantity < 0` returns 400. There is no override flag in this route; if you add one, ensure both the update and audit paths understand it.
- Audit-or-rollback: adjust will revert the `inventory` update if the `inventory_log` insert fails. Do not remove or bypass the log insert without providing an equivalent atomic log guarantee (e.g., DB trigger or transaction), or you risk unlogged stock changes.
- Intake approval threshold: deviation > 50% from `get_avg_cost_per_gram` over 90 days triggers `requires_approval`. Changes to this logic alter who gets auto-applied. Keep UI and reviewer workflows aligned.
- RPC dependencies: `get_avg_cost_per_gram` and `applyIntakeMutationViaRpc` must exist and be callable by the service role/user tied to `createClient()`. If RPCs are unavailable or RLS blocks them, auto-approval will fail inside `processIntake`.
- Batch cleanup is best-effort: only newly created batches (`createdNow`) are deleted on failure. Pre-existing batches will remain; ensure downstream logic is idempotent with respect to batch reuse.
- Timestamp consistency: routes set `updated_at`/`approved_at` with `new Date().toISOString()`. If the DB overwrites timestamps (triggers/defaults), be aware that API-provided times may differ.
- RLS/permissions: The routes rely on Supabase auth and implied RLS for scoping to a `business_id`. Tighten or test policies to prevent cross-business access.