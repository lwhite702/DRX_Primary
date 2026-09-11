export interface UnitAlias {
  id: string; alias_name: string; standard_unit: "g" | "oz"; quantity: number; is_enabled: boolean; is_system_default: boolean;
}
export async function changeUnitAlias(businessId: string, body: Record<string, unknown>, signal?: AbortSignal) {
  const response = await fetch("/api/inventory/aliases", { method: "POST", headers: { "Content-Type": "application/json", "X-Business-Id": businessId }, body: JSON.stringify(body), cache: "no-store", signal });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error ?? "Failed to change alias");
  return data;
}
export async function loadUnitAliases(businessId: string, signal?: AbortSignal): Promise<UnitAlias[]> {
  const rows: UnitAlias[] = []; let cursor: string | null = null;
  const seen = new Set<string>();
  for (;;) {
    const response: Response = await fetch(`/api/inventory/aliases${cursor ? `?cursor=${encodeURIComponent(cursor)}` : ""}`, { headers: { "X-Business-Id": businessId }, cache: "no-store", signal });
    const data: { data?: UnitAlias[]; nextCursor?: unknown } = await response.json();
    if (!response.ok || !Array.isArray(data.data)) throw new Error("Failed to load aliases");
    rows.push(...data.data);
    if (data.nextCursor === null) return rows.sort((a, b) => a.alias_name.localeCompare(b.alias_name));
    if (typeof data.nextCursor !== "string" || seen.has(data.nextCursor)) throw new Error("Alias pagination failed");
    seen.add(data.nextCursor); cursor = data.nextCursor;
  }
}
export function aliasWeightGrams(alias: Pick<UnitAlias, "quantity" | "standard_unit">) {
  return alias.quantity * (alias.standard_unit === "oz" ? 28.349523125 : 1);
}
