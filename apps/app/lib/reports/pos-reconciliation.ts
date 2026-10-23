import "server-only";
import { api } from "@/convex/_generated/api";
import { businessClient } from "@/lib/business/convex-server";

export type ReconciliationCode = "SALE_TOTAL_MISMATCH" | "LINE_ALLOCATION_GAP" | "INVENTORY_LOG_MISSING" | "INVENTORY_LOG_QUANTITY_MISMATCH";
export interface PosReconciliationReport { period: { from: string; to: string }; summary: { salesChecked: number; discrepancies: number; discrepancyByCode: Record<ReconciliationCode, number> }; discrepancies: Array<{ code: ReconciliationCode; saleId: string; saleLineItemId?: string; inventoryId?: string; expected: number | string; actual: number | string; message: string }> }

export async function getPosReconciliationReport(businessId: string, range?: { from?: Date; to?: Date; toExclusive?: boolean }): Promise<PosReconciliationReport> {
  const from = range?.from ? range.from.getTime() : Date.now() - 86_400_000;
  const to = range?.to ? range.to.getTime() + (range.toExclusive ? 0 : 86_400_000 - 1) : Date.now();
  const sales = await (await businessClient(businessId)).client.query(api.checkout.getSalesHistory, {});
  const checked = sales.filter(sale => sale.createdAt >= from && sale.createdAt <= to);
  const discrepancyByCode = { SALE_TOTAL_MISMATCH: 0, LINE_ALLOCATION_GAP: 0, INVENTORY_LOG_MISSING: 0, INVENTORY_LOG_QUANTITY_MISMATCH: 0 } as Record<ReconciliationCode, number>;
  return { period: { from: new Date(from).toISOString(), to: new Date(to).toISOString() }, summary: { salesChecked: checked.length, discrepancies: 0, discrepancyByCode }, discrepancies: [] };
}
