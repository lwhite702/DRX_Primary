export function inventoryText(value: unknown): string {
  return typeof value === "string" ? value : "";
}

export function inventoryNumber(
  item: Record<string, unknown>,
  snakeCaseKey: string,
  camelCaseKey: string,
): number {
  const value = item[snakeCaseKey] ?? item[camelCaseKey] ?? 0;
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

export function unwrapApiData<T>(payload: unknown): T | null {
  if (!payload || typeof payload !== "object") return null;
  const first = (payload as { data?: unknown }).data ?? payload;
  if (!first || typeof first !== "object") return null;
  const second = (first as { data?: unknown }).data ?? first;
  return second && typeof second === "object" ? second as T : null;
}

export function processedCount(payload: unknown): number {
  const data = unwrapApiData<Record<string, unknown>>(payload);
  const summary = data?.summary;
  const record = summary && typeof summary === "object"
    ? summary as Record<string, unknown>
    : data;
  const value = record?.processed_count ?? record?.processedCount ?? 0;
  const count = Number(value);
  return Number.isFinite(count) ? count : 0;
}
