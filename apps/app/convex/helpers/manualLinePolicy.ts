export function normalizeManualLineName(value: string): {
  name: string;
  nameKey: string;
} {
  const name = value.normalize("NFKC").trim().replace(/\s+/g, " ");
  if (!name || name.length > 80) {
    throw new Error(
      "INVALID_ARGUMENT: manual name must be between 1 and 80 characters",
    );
  }
  return { name, nameKey: name.toLocaleLowerCase("en-US") };
}
