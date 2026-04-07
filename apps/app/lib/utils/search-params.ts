export function toSearchParamSuffix(
  params: Record<string, string | string[] | undefined>,
): string {
  const query = new URLSearchParams();

  for (const [key, raw] of Object.entries(params)) {
    if (raw === undefined) continue;
    if (Array.isArray(raw)) {
      for (const value of raw) query.append(key, value);
      continue;
    }
    query.set(key, raw);
  }

  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}
