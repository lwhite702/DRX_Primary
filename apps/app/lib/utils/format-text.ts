/**
 * Formats a string to Title Case.
 * Handles spaces, hyphens, and apostrophes (e.g. "mary-jane o'connor" -> "Mary-Jane O'Connor").
 */
export function toTitleCase(val: string): string {
  if (!val || typeof val !== "string") return val;
  const trimmed = val.trim();
  if (!trimmed) return trimmed;
  return trimmed
    .toLowerCase()
    .replace(/(?:^|[\s\-'])\p{L}/gu, (match) => match.toUpperCase());
}
